// node src/benchmark.ts <dev|holdout|extended> <verifier|agent_tests|review|ci|sim|all>
// Runs the same cases through each approach and records raw results, including failures.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, REPO, type Case } from './cases.ts';
import { verify, diffFor, fullDiffFor } from './pipeline.ts';
import { modelFromEnv, Pending } from './model.ts';
import * as P from './prompts.ts';
import { simPlanning, simReviewDiff, simReviewVerdict } from './simulate.ts';
import { ROOT, buildImage, ensureNetwork, runScenario, pool, sh, goExperiment } from './sandbox.ts';

const [split, what = 'all'] = process.argv.slice(2);
const OUT = join(ROOT, '.work/results', split); mkdirSync(OUT, { recursive: true });
const cases = loadCases().filter((c) => c.split === split);
const model = modelFromEnv();
const save = (name: string, data: unknown) => writeFileSync(join(OUT, name + '.json'), JSON.stringify(data, null, 1));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pending: string[] = [];

async function runVerifier(c: Case) {
  const r = await verify({ key: c.id, repo: REPO, base: c.base, head: c.head, issue: c.issue }, model);
  log(c.id, 'verifier', r.verdict, `reach ${r.reach.reached}/${r.reach.total}`);
  return r;
}
async function runAgentTests(c: Case) {
  const diff = diffFor(REPO, c.base, c.head);
  const { scenarios } = await model.json('agent_tests', c.id, P.writeAgentTests(c.issue, fullDiffFor(REPO, c.base, c.head)));
  await ensureNetwork();
  const image = await buildImage(REPO, c.head);
  const runs = await pool(scenarios, 4, (s: any) => runScenario({ image, scenario: s }));
  const failed = runs.filter((r) => r.status !== 'pass').map((r) => r.id);
  return { id: c.id, approve: failed.length === 0, total: runs.length, failed, runs };
}
async function runReview(c: Case) {
  const diff = diffFor(REPO, c.base, c.head);
  return { id: c.id, ...(await model.json('review', c.id, P.reviewDiff(c.issue, c.prTitle, c.prBody, fullDiffFor(REPO, c.base, c.head)))) };
}
// Existing CI: the project's own Go tests at the head commit, for the packages the PR touches.
async function runCi(c: Case) {
  const cacheFile = join(OUT, `ci-${c.id}.json`);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  const files = (await sh('git', ['-C', REPO, 'diff', '--name-only', `${c.base}..${c.head}`, '--', '*.go'])).split('\n').filter(Boolean);
  const pkgs = [...new Set(files.map((f) => './' + f.split('/').slice(0, -1).join('/')).filter((p) => /^\.\/(apis|core|tools)/.test(p)))];
  if (!pkgs.length) return { id: c.id, pass: true, pkgs, note: 'no tested packages touched' };
  const started = Date.now();
  const script = `mkdir -p /s && git -C /repo archive ${c.head} | tar -x -C /s && cd /s && CGO_ENABLED=0 go test ${pkgs.join(' ')} 2>&1 | tail -15`;
  const out = await sh('docker', ['run', '--rm', '-v', `${REPO}:/repo:ro`, '-v', 'vouch-gomod:/go/pkg/mod', '-v', 'vouch-gocache:/root/.cache/go-build', '-e', 'GOFLAGS=-buildvcs=false', '-e', `GOEXPERIMENT=${await goExperiment(REPO, c.head)}`, 'golang:1.27-alpine', 'sh', '-c', `apk add -q git >/dev/null; git config --global --add safe.directory '*'; ${script}`]);
  const r = { id: c.id, pkgs, pass: !/^(FAIL|--- FAIL|panic:)/m.test(out) && /^ok/m.test(out), tail: out.slice(-1200), wallMs: Date.now() - started };
  writeFileSync(cacheFile, JSON.stringify(r));
  log(c.id, 'ci', r.pass ? 'pass' : 'FAIL');
  return r;
}

// Simulated engineer at each human step (src/simulate.ts). Needs this split's verifier results.
let verifierResults: Record<string, any> | undefined;
async function runSim(c: Case) {
  verifierResults ??= existsSync(join(OUT, 'verifier.json')) ? JSON.parse(readFileSync(join(OUT, 'verifier.json'), 'utf8')) : {};
  const vr = verifierResults![c.id];
  const diff = diffFor(REPO, c.base, c.head);
  // Each step's prompt is written even when another step is still waiting for its answer,
  // so the diff reviewer and the verdict reviewer can be answered by separate writers at once.
  const waiting: Pending[] = [];
  const step = async <T>(f: () => Promise<T>) => { try { return await f(); } catch (e) { if (e instanceof Pending) { waiting.push(e); return undefined; } throw e; } };
  const reviewDiff = await step(() => simReviewDiff(c.id, c, diff, model));
  if (!vr || vr.error) { if (waiting.length) throw waiting[0]; return { id: c.id, reviewDiff, note: 'no verifier result, so no planning or verdict review' }; }
  const planning = await step(() => simPlanning(c.id, c.issue, vr.locked?.claims ?? [], model));
  const reviewVerdict = await step(() => simReviewVerdict(c.id, c.issue, vr, model));
  if (waiting.length) { for (const w of waiting.slice(1)) pending.push(w.message); throw waiting[0]; }
  log(c.id, 'sim', `diff:${reviewDiff.decision} verdict:${reviewVerdict.decision}`);
  return { id: c.id, planning, reviewDiff, reviewVerdict };
}

async function each<T>(name: string, n: number, fn: (c: Case) => Promise<T>) {
  const results: Record<string, T | { error: string }> = {};
  await pool(cases, n, async (c) => {
    const started = Date.now();
    // Wall time for this case and approach. CI keeps the time of its original run when read from cache.
    try { const r: any = await fn(c); results[c.id] = r && typeof r === 'object' && r.wallMs == null ? { ...r, wallMs: Date.now() - started } : r; }
    catch (e: any) {
      if (e instanceof Pending) pending.push(e.message);
      else { results[c.id] = { error: String(e.message ?? e).slice(0, 600) }; log(c.id, name, 'ERROR', String(e.message ?? e).slice(0, 300)); }
    }
  });
  save(name, results);
}
log('cases', cases.map((c) => c.id).join(' '));
save('cases', cases.map(({ defect, ...c }) => ({ ...c, hasDefectNote: !!defect })));
if (what === 'all' || what === 'ci') await each('ci', 2, runCi);
if (what === 'all' || what === 'verifier') await each('verifier', 2, runVerifier);
if (what === 'all' || what === 'agent_tests') await each('agent_tests', 3, runAgentTests);
if (what === 'all' || what === 'review') await each('review', 4, runReview);
if (what === 'all' || what === 'sim') await each('sim', 3, runSim);
if (pending.length) log('WAITING ON MODEL ANSWERS:', pending.join(' '));
