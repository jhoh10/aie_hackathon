// node src/export.ts > eval.json   One row per case with every approach's outcome, for charts.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';
import { decide } from './verdict.ts';
const V: any = { PASS: 'pass', BLOCK: 'stop', NEEDS_HUMAN: 'human' };
const rows: any[] = [];
for (const split of ['dev', 'holdout', 'extended']) {
  const dir = join(ROOT, '.work/results', split);
  const load = (n: string) => (existsSync(join(dir, n + '.json')) ? JSON.parse(readFileSync(join(dir, n + '.json'), 'utf8')) : {});
  const cases = existsSync(join(dir, 'cases.json')) ? JSON.parse(readFileSync(join(dir, 'cases.json'), 'utf8')) : [];
  const [v, a, r, ci] = ['verifier', 'agent_tests', 'review', 'ci'].map(load);
  for (const c of cases) {
    const vr = v[c.id], cl = vr?.claims ?? [];
    rows.push({
      case: c.id, split, group: c.group, expected: c.expected,
      ci: ci[c.id] && !ci[c.id].error ? (ci[c.id].pass ? 'pass' : 'stop') : 'missing',
      agent_tests: a[c.id] && !a[c.id].error ? (a[c.id].approve ? 'pass' : 'stop') : 'missing',
      review: r[c.id] && !r[c.id].error ? (r[c.id].verdict === 'approve' ? 'pass' : 'stop') : 'missing',
      claims_only: vr?.claims ? V[decide({ claims: vr.claims, probes: [], reach: vr.reach, minReach: 0.3 }).verdict] : 'missing',
      // Recomputed from recorded evidence with the current rules, ignoring findings from the dropped instability rule.
      verifier: vr?.claims ? V[decide({ claims: vr.claims, probes: (vr.probes.changed ?? []).filter((f: any) => !(vr.probes.newlyUnstable ?? []).includes(f.id) || vr.probes.triage?.some((t: any) => t.id === f.id)), reach: vr.reach, minReach: 0.3 }).verdict] : 'missing',
      recorded_verdict: vr?.verdict ?? null,
      claims_proven: cl.filter((x: any) => x.result === 'proven').length,
      claims_unproven: cl.filter((x: any) => x.result === 'unproven').length,
      claims_failed: cl.filter((x: any) => x.result === 'failed').length,
      reach_pct: vr?.reach?.total ? Math.round((100 * vr.reach.reached) / vr.reach.total) : null,
    });
  }
}
process.stdout.write(JSON.stringify(rows, null, 1));
