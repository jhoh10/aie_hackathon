// Serves the per-PR verification page and drives each run.
//   node src/server.ts --case h-bearer [--case r-number]   local runs from the benchmark
//   node src/server.ts --repo owner/name --clone <path>    watch PRs and post commit statuses
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';
import { verify, extractClaimsFor } from './pipeline.ts';
import { modelFromEnv } from './model.ts';
import { loadCases, REPO } from './cases.ts';
import * as GH from './github.ts';

const args = process.argv.slice(2);
const opt = (k: string) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const PORT = +(process.env.PORT ?? 4600);
const STORE = join(ROOT, '.work/runs'); mkdirSync(STORE, { recursive: true });
const model = modelFromEnv();
const runs = new Map<string, any>();
const listeners = new Map<string, Set<any>>();
const persist = (r: any) => writeFileSync(join(STORE, r.id + '.json'), JSON.stringify(r, null, 1));
function touch(r: any) {
  persist(r);
  for (const res of listeners.get(r.id) ?? []) res.write(`data: ${JSON.stringify(view(r))}\n\n`);
}
const view = (r: any) => { const { github, ...rest } = r; return { ...rest, github: github ? { repo: github.repo, number: github.number, url: github.url } : undefined }; };

async function report(r: any, state: 'pending' | 'success' | 'failure' | 'error', desc: string) {
  if (!r.github) return;
  await GH.setStatus(r.github.repo, r.head, state, desc).catch((e) => console.error('status', String(e).slice(0, 200)));
}

export async function startRun(init: any) {
  const r = { phase: 'extracting', scenarios: [], claims: null, result: null, override: null, createdAt: new Date().toISOString(), ...init };
  runs.set(r.id, r); touch(r);
  await report(r, 'pending', 'Waiting for intent to be extracted');
  try {
    r.claims = r.claims ?? await extractClaimsFor(r.key, r.issue, model);
    if (r.autoRun) return execute(r);
    r.phase = 'awaiting_approval'; r.claimsReadyAt = new Date().toISOString(); touch(r);
    await report(r, 'pending', 'Waiting for a person to approve the intent');
  } catch (e: any) { fail(r, e); }
}

function fail(r: any, e: any) { r.phase = 'error'; r.error = String(e.message ?? e).slice(0, 800); touch(r); report(r, 'error', 'Verifier error, merge stays blocked'); }

async function execute(r: any) {
  r.phase = 'running'; r.scenarios = []; r.result = null; touch(r);
  await report(r, 'pending', 'Running locked checks on old and new versions');
  try {
    const result = await verify({ key: r.key, repo: r.repo, base: r.base, head: r.head, issue: r.issue, approvedClaims: r.claims,
      onEvent: (e, d: any) => { if (e === 'scenario') r.scenarios.push(d); if (e === 'locked') r.lock = d; r.lastEvent = e; touch(r); } }, model);
    r.result = result; r.phase = 'done'; r.doneAt = new Date().toISOString(); touch(r);
    const pass = result.verdict === 'PASS';
    await report(r, pass ? 'success' : 'failure', pass ? 'All approved claims proven' : `${result.verdict}: ${result.reasons[0] ?? ''}`);
    if (r.github) await GH.comment(r.github.repo, r.github.number, `**vouch: ${result.verdict}**\n\n${result.claims.map((c: any) => `- ${c.result}: ${c.text}`).join('\n')}${result.reasons.length ? `\n\n${result.reasons.map((x: string) => `- ${x}`).join('\n')}` : ''}\n\nChanged statements reached: ${result.reach.reached}/${result.reach.total}. Evidence lock: \`${result.lock.slice(0, 12)}\``).catch(() => {});
  } catch (e) { fail(r, e); }
}

const body = (req: any) => new Promise<any>((res, rej) => { let b = ''; req.on('data', (d: any) => { b += d; if (b.length > 1e6) rej(new Error('too large')); }); req.on('end', () => { try { res(b ? JSON.parse(b) : {}); } catch (e) { rej(e); } }); });
const json = (res: any, code: number, d: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };

createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://x');
  const m = url.pathname.match(/^\/api\/runs\/([\w-]+)(?:\/(events|approve|override))?$/);
  try {
    if (url.pathname === '/') { const first = [...runs.keys()].at(-1); res.writeHead(302, { location: first ? `/runs/${first}` : '/runs/none' }); return res.end(); }
    if (url.pathname.startsWith('/runs/')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(readFileSync(join(ROOT, 'ui/run.html'))); }
    if (!m) return json(res, 404, { error: 'not found' });
    const r = runs.get(m[1]);
    if (!r) return json(res, 404, { error: 'unknown run' });
    if (!m[2]) return json(res, 200, view(r));
    if (m[2] === 'events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      res.write(`data: ${JSON.stringify(view(r))}\n\n`);
      if (!listeners.has(r.id)) listeners.set(r.id, new Set());
      listeners.get(r.id)!.add(res); req.on('close', () => listeners.get(r.id)!.delete(res));
      return;
    }
    if (req.method !== 'POST') return json(res, 405, {});
    const b = await body(req);
    if (m[2] === 'approve') {
      if (r.phase !== 'awaiting_approval') return json(res, 409, { error: 'claims are locked' });
      if (!Array.isArray(b.claims) || !b.claims.length) return json(res, 400, { error: 'claims required' });
      r.claims = b.claims.map((c: any, i: number) => ({ id: c.id ?? `c${i + 1}`, text: String(c.text), kind: c.kind === 'no_behavior_change' ? c.kind : 'behavior_change' }));
      r.approvedAt = new Date().toISOString(); json(res, 200, { ok: true }); execute(r); return;
    }
    if (m[2] === 'override') {
      if (r.phase !== 'done' || r.result.verdict === 'PASS') return json(res, 409, { error: 'nothing to override' });
      if (!b.by || !b.reason) return json(res, 400, { error: 'name and reason required' });
      r.override = { by: String(b.by).slice(0, 80), reason: String(b.reason).slice(0, 500), at: new Date().toISOString() }; touch(r);
      await report(r, 'success', `Overridden by ${r.override.by}`);
      if (r.github) await GH.comment(r.github.repo, r.github.number, `**vouch override** by ${r.override.by}: ${r.override.reason}`).catch(() => {});
      return json(res, 200, { ok: true });
    }
  } catch (e: any) { json(res, 500, { error: String(e.message ?? e) }); }
}).listen(PORT, '127.0.0.1', () => console.log(`vouch on http://localhost:${PORT}`));

const caseIds = opt('--case');
if (caseIds.length) {
  const all = loadCases();
  for (const id of caseIds) {
    const c = all.find((x) => x.id === id);
    if (!c) { console.error('no case', id); continue; }
    startRun({ id, key: id, repo: REPO, base: c.base, head: c.head, issue: c.issue, title: c.prTitle });
  }
}
const [watch] = opt('--repo'); const [clone] = opt('--clone');
if (watch && clone) {
  const seen = new Map<number, string>();
  const tick = async () => {
    try {
      for (const pr of await GH.openPrs(watch)) {
        if (seen.get(pr.number) === pr.headRefOid) continue;
        const prior = runs.get(`pr-${pr.number}`);
        seen.set(pr.number, pr.headRefOid);
        await GH.fetchPr(clone, pr.number);
        const issue: any = await GH.linkedIssue(watch, pr.body ?? '');
        // Intent comes from the linked issue. A PR description alone isn't trusted as intent, so it's flagged for the approver.
        const intent = issue ? `${issue.title}\n\n${issue.body}` : `(No linked issue. PR description follows, written by the author.)\n${pr.title}\n${pr.body}`;
        startRun({ id: `pr-${pr.number}`, key: `pr-${pr.number}`, repo: clone, base: pr.baseRefOid, head: pr.headRefOid, issue: intent, title: pr.title,
          github: { repo: watch, number: pr.number, url: pr.url }, intentSource: issue ? 'issue' : 'pr_description',
          ...(prior?.claims && prior.phase !== 'extracting' ? { claims: prior.claims, autoRun: true } : {}) });
      }
    } catch (e) { console.error('poll', String(e).slice(0, 200)); }
    setTimeout(tick, 5000);
  };
  tick();
}
