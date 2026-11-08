// The hand-off from the harness to the verifier, for one benchmark case.
//   node --no-warnings src/handoff.ts <path/to/.verify/plan.md> --case h-bearer
// 1. Reads the approved plan the harness wrote and turns its Claims table into the claims JSON
//    (docs/claims-contract.md), saved next to the plan as claims.json.
// 2. Runs the verifier on the case's old and new commits with exactly those claims.
// 3. Prints the verdict with evidence and saves the full result under .work/runs/.
// Exit code: 0 PASS, 1 BLOCK, 2 NEEDS_HUMAN, 3 error.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './sandbox.ts';

export interface Claim { id: string; text: string; kind: 'behavior_change' | 'no_behavior_change'; group?: string; }

/** Parses the Claims table of a harness plan (test-plan-template.md, section 2). Refuses unapproved plans. */
export function planToClaims(md: string): { approvedBy: string; claims: Claim[] } {
  const status = md.match(/^Status:\s*(.+)$/m)?.[1].trim() ?? '';
  const approved = status.match(/^APPROVED by (.+?)(?: on .+)?$/);
  if (!approved) throw new Error(`plan is not approved (Status: ${status || 'missing'}). The engineer approves the claims before the verifier runs.`);
  const section = md.split(/^## Claims\s*$/m)[1]?.split(/^## /m)[0];
  if (!section) throw new Error('plan has no "## Claims" section');
  const rows = section.split('\n').filter((l) => l.trim().startsWith('|')).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const [head, , ...body] = rows;
  const col = (name: string) => head.findIndex((h) => h.toLowerCase() === name);
  const [iId, iText, iKind, iGroup] = [col('#'), col('claim'), col('kind'), col('group')];
  if (iId < 0 || iText < 0 || iKind < 0) throw new Error('Claims table needs the columns #, Claim and Kind');
  const claims = body.map((r) => {
    const c: Claim = { id: r[iId], text: r[iText], kind: r[iKind] as Claim['kind'] };
    if (iGroup >= 0 && r[iGroup]) c.group = r[iGroup];
    return c;
  });
  const seen = new Set<string>();
  for (const c of claims) {
    if (!c.id || !c.text) throw new Error(`claim row is missing an id or text: ${JSON.stringify(c)}`);
    if (seen.has(c.id)) throw new Error(`duplicate claim id ${c.id}`);
    if (c.kind !== 'behavior_change' && c.kind !== 'no_behavior_change') throw new Error(`claim ${c.id}: kind must be behavior_change or no_behavior_change, got "${c.kind}"`);
    seen.add(c.id);
  }
  if (!claims.length) throw new Error('plan has no claims');
  return { approvedBy: approved[1], claims };
}

async function main() {
  const args = process.argv.slice(2);
  const planPath = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--case');
  const caseId = args[args.indexOf('--case') + 1];
  if (!planPath || !args.includes('--case') || !caseId) { console.error('usage: node --no-warnings src/handoff.ts <plan.md> --case <id>'); process.exit(3); }

  const { approvedBy, claims } = planToClaims(readFileSync(planPath, 'utf8'));
  const claimsPath = join(dirname(resolve(planPath)), 'claims.json');
  writeFileSync(claimsPath, JSON.stringify({ claims }, null, 2) + '\n');
  console.log(`claims  ${claims.length} approved by ${approvedBy} -> ${claimsPath}`);
  for (const c of claims) console.log(`  ${c.id} [${c.kind}] ${c.text}`);

  // Model step. With MODEL_API_KEY set, the verifier's own model writes the checks. Without it, the
  // files fallback reads answers from .work/gen/<key>. The example can ship those answers in an
  // `answers/` folder next to .verify/, which are copied in when nothing is cached yet.
  const key = `handoff-${caseId}`;
  if (!process.env.MODEL_API_KEY) {
    const shipped = join(dirname(dirname(resolve(planPath))), 'answers');
    const gen = join(ROOT, '.work/gen', key);
    if (existsSync(shipped)) {
      mkdirSync(gen, { recursive: true });
      for (const f of readdirSync(shipped)) if (f.endsWith('.json') && !existsSync(join(gen, f))) copyFileSync(join(shipped, f), join(gen, f));
      console.log(`model   files: no MODEL_API_KEY, so the checks come from the hand-written answers in ${shipped}`);
    } else console.log(`model   files: no MODEL_API_KEY, reading answers from ${gen}`);
  }
  const { modelFromEnv } = await import('./model.ts');
  const { loadCases, REPO } = await import('./cases.ts');
  const { verify } = await import('./pipeline.ts');
  const model = modelFromEnv();
  if (process.env.MODEL_API_KEY) console.log(`model   ${model.name}`);

  if (!existsSync(join(REPO, '.git'))) throw new Error(`no PocketBase clone at ${REPO}. Run: git clone https://github.com/pocketbase/pocketbase ${REPO}`);
  const c = loadCases().find((x) => x.id === caseId);
  if (!c) throw new Error(`no case ${caseId} in cases/manifest.json`);
  console.log(`case    ${c.id}: old ${c.base.slice(0, 8)} -> new ${c.head.slice(0, 8)}`);
  console.log('verify  building both versions in Docker and running the checks (first build takes a few minutes)...');

  const result = await verify({ key, repo: REPO, base: c.base, head: c.head, issue: c.issue, approvedClaims: claims,
    onEvent: (e, d: any) => {
      if (e === 'locked') console.log(`locked  ${d.claimTests} claim checks, ${d.probes} probes, lock ${d.lock.slice(0, 12)}`);
      if (e === 'built') console.log('built   old and new images');
      if (e === 'scenario') console.log(`  ${d.kind === 'probe' ? 'probe' : 'check'} ${d.id}${d.claim ? ` (${d.claim})` : ''}: old ${d.base}, new ${d.head}${d.changed ? ', response changed' : ''}`);
    } }, model);

  const store = join(ROOT, '.work/runs'); mkdirSync(store, { recursive: true });
  const out = join(store, `${key}.json`);
  writeFileSync(out, JSON.stringify({ plan: resolve(planPath), approvedBy, ...result }, null, 1));
  console.log('');
  for (const cl of result.claims) {
    console.log(`${cl.result.toUpperCase().padEnd(9)}${cl.id}: ${cl.text}`);
    for (const s of cl.scenarios) {
      const last = (r: any) => r.steps.at(-1);
      console.log(`         ${s.id} ${s.result}: old ${s.base} (HTTP ${last(s.evidence.base)?.responseStatus ?? '-'}), new ${s.head} (HTTP ${last(s.evidence.head)?.responseStatus ?? '-'})`);
    }
  }
  console.log(`probes   ${result.probes.total} run, ${result.probes.changed.length} changed${result.probes.changed.length ? ': ' + result.probes.changed.map((p: any) => `${p.id} ${p.triage}`).join(', ') : ''}${result.probes.unstable.length ? `, unstable: ${result.probes.unstable.join(', ')}` : ''}`);
  console.log(`reach    ${result.reach.reached}/${result.reach.total} changed statements executed`);
  console.log(`\nVERDICT  ${result.verdict}${result.reasons.length ? '\n' + result.reasons.map((r: string) => `  - ${r}`).join('\n') : ''}`);
  console.log(`evidence ${out}`);
  process.exit(result.verdict === 'PASS' ? 0 : result.verdict === 'BLOCK' ? 1 : 2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error('error  ', e.message ?? e); process.exit(3); });
