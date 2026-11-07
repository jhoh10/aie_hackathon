// node src/benchmark.ts <dev|holdout> <verifier|agent_tests|review|ci|all>
// Runs the same cases through each approach and records raw results, including failures.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, REPO, type Case } from './cases.ts';
import { verify, diffFor } from './pipeline.ts';
import { modelFromEnv, Pending } from './model.ts';
import * as P from './prompts.ts';
import { ROOT, buildImage, ensureNetwork, runScenario, pool, sh } from './sandbox.ts';

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
  const { scenarios } = await model.json('agent_tests', c.id, P.writeAgentTests(c.issue, diff));
  await ensureNetwork();
  const image = await buildImage(REPO, c.head);
  const runs = await pool(scenarios, 4, (s: any) => runScenario({ image, scenario: s }));
  const failed = runs.filter((r) => r.status !== 'pass').map((r) => r.id);
  return { id: c.id, approve: failed.length === 0, total: runs.length, failed, runs };
}
async function runReview(c: Case) {
  const diff = diffFor(REPO, c.base, c.head);
  return { id: c.id, ...(await model.json('review', c.id, P.reviewDiff(c.issue, c.prTitle, c.prBody, diff))) };
}
// Existing CI: the project's own Go tests at the head commit, for the packages the PR touches.
async function runCi(c: Case) {
  const cacheFile = join(OUT, `ci-${c.id}.json`);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  const files = (await sh('git', ['-C', REPO, 'diff', '--name-only', `${c.base}..${c.head}`, '--', '*.go'])).split('\n').filter(Boolean);
  const pkgs = [...new Set(files.map((f) => './' + f.split('/').slice(0, -1).join('/')).filter((p) => /^\.\/(apis|core|tools)/.test(p)))];
  if (!pkgs.length) return { id: c.id, pass: true, pkgs, note: 'no tested packages touched' };
  const script = `mkdir -p /s && git -C /repo archive ${c.head} | tar -x -C /s && cd /s && CGO_ENABLED=0 go test ${pkgs.join(' ')} 2>&1 | tail -15`;
  const out = await sh('docker', ['run', '--rm', '-v', `${REPO}:/repo:ro`, '-v', 'vouch-gomod:/go/pkg/mod', '-v', 'vouch-gocache:/root/.cache/go-build', '-e', 'GOFLAGS=-buildvcs=false', 'golang:1.27-alpine', 'sh', '-c', `apk add -q git >/dev/null; git config --global --add safe.directory '*'; ${script}`]);
  const r = { id: c.id, pkgs, pass: !/^(FAIL|--- FAIL|panic:)/m.test(out) && /^ok/m.test(out), tail: out.slice(-1200) };
  writeFileSync(cacheFile, JSON.stringify(r));
  log(c.id, 'ci', r.pass ? 'pass' : 'FAIL');
  return r;
}

async function each<T>(name: string, n: number, fn: (c: Case) => Promise<T>) {
  const results: Record<string, T | { error: string }> = {};
  await pool(cases, n, async (c) => {
    try { results[c.id] = await fn(c); }
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
if (what === 'all' || what === 'verifier') await each('verifier', 3, runVerifier);
if (what === 'all' || what === 'agent_tests') await each('agent_tests', 3, runAgentTests);
if (what === 'all' || what === 'review') await each('review', 4, runReview);
if (pending.length) log('WAITING ON MODEL ANSWERS:', pending.join(' '));
