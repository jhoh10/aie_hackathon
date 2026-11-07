// The verification procedure: approved intent -> locked tests -> old/new runs -> evidence -> verdict.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as P from './prompts.ts';
import type { Model } from './model.ts';
import { buildImage, ensureNetwork, runScenario, pool, newCoverageVolume, readCoverage } from './sandbox.ts';
import { fingerprint, type ScenarioRun } from './normalize.ts';
import { classifyClaimScenario, rollupClaim, decide, type Observed, type ClaimResult, type ProbeFinding } from './verdict.ts';
import { reachOfChanged } from './reach.ts';

export interface VerifyInput { key: string; repo: string; base: string; head: string; issue: string; approvedClaims?: any[]; onEvent?: (e: string, d?: unknown) => void; concurrency?: number; minReach?: number; }
const REPS = 2;

export function diffFor(repo: string, base: string, head: string) {
  return execFileSync('git', ['-C', repo, 'diff', `${base}..${head}`, '--', '*.go', ':!*_test.go'], { maxBuffer: 1 << 28 }).toString();
}
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');

async function observe(image: string, s: any, cov?: string) {
  const runs: ScenarioRun[] = [];
  for (let i = 0; i < REPS; i++) runs.push(await runScenario({ image, scenario: s, covVolume: cov }));
  const prints = runs.map(fingerprint);
  return { status: runs[0].status, stable: runs.every((r) => r.status === runs[0].status), identical: prints.every((p) => p === prints[0]), print: prints[0], run: runs[0] };
}

export async function extractClaimsFor(key: string, issue: string, model: Model) {
  return (await model.json('claims', key, P.extractClaims(issue))).claims as any[];
}

export async function verify(i: VerifyInput, model: Model) {
  const emit = i.onEvent ?? (() => {});
  const conc = i.concurrency ?? 4;
  // Independent stage: nothing here can read the diff.
  const claims = i.approvedClaims ?? (await extractClaimsFor(i.key, i.issue, model));
  emit('claims', { claims });
  const claimTests = (await model.json('claim_tests', i.key, P.writeClaimTests(claims))).scenarios;
  const diff = diffFor(i.repo, i.base, i.head);
  const probes = (await model.json('probes', i.key, P.writeProbes(diff))).scenarios.map((p: any) => ({ ...p, kind: 'probe' }));
  const lock = sha({ claims, claimTests, probes });
  emit('locked', { lock, claimTests: claimTests.length, probes: probes.length });

  await ensureNetwork();
  const [baseImg, headImg] = await Promise.all([buildImage(i.repo, i.base), buildImage(i.repo, i.head)]);
  emit('built');
  const cov = await newCoverageVolume();
  const runBoth = async (s: any) => {
    const [base, head] = await Promise.all([observe(baseImg, s), observe(headImg, s, cov)]);
    emit('scenario', { id: s.id, kind: s.kind ?? 'claim', claim: s.claim, base: base.status, head: head.status, changed: base.print !== head.print });
    return { s, base, head };
  };
  const claimRuns = await pool(claimTests, conc, runBoth);
  const probeRuns = await pool(probes, conc, runBoth);
  const profile = await readCoverage(cov).catch(() => '');
  const reach = reachOfChanged(diff, profile);

  const claimResults: { id: string; text: string; result: ClaimResult; scenarios: any[] }[] = claims.map((c: any) => {
    const mine = claimRuns.filter((r: any) => r.s.claim === c.id);
    const classified = mine.map((r: any) => ({ id: r.s.id, result: classifyClaimScenario(r.base as Observed, r.head as Observed), base: r.base.status, head: r.head.status, evidence: { base: r.base.run, head: r.head.run } }));
    return { id: c.id, text: c.text, result: rollupClaim({ id: c.id, kind: c.kind, results: classified.map((x: any) => x.result) }), scenarios: classified };
  });

  const changed = probeRuns.filter((r: any) => r.base.identical && r.head.identical && r.base.print !== r.head.print);
  const unstable = probeRuns.filter((r: any) => !r.base.identical || !r.head.identical).map((r: any) => r.s.id);
  let findings: ProbeFinding[] = [];
  let triage: any[] = [];
  if (changed.length) {
    const summary = changed.map((r: any) => ({ id: r.s.id, old: JSON.parse(r.base.print), new: JSON.parse(r.head.print) }));
    triage = (await model.json('triage', i.key, P.triageDiff(claims, summary))).findings;
    findings = changed.map((r: any) => { const t = triage.find((x) => x.id === r.s.id); return { id: r.s.id, changed: true, triage: t?.triage ?? 'unknown', severity: t?.severity }; });
  }
  const decision = decide({ claims: claimResults, probes: findings, reach, minReach: i.minReach ?? 0.3 });
  const result = { key: i.key, base: i.base, head: i.head, lock, locked: { claims, claimTests, probes, triage }, ...decision, claims: claimResults, probes: { total: probes.length, changed: findings, triage, unstable, runs: probeRuns.map((r: any) => ({ id: r.s.id, base: r.base.run, head: r.head.run, changed: r.base.print !== r.head.print })) }, reach };
  emit('verdict', { verdict: decision.verdict, reasons: decision.reasons });
  return result;
}
