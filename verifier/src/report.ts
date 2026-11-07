// node src/report.ts <split...>  Scores recorded results. Rules were fixed before any results existed:
// - a bad PR is caught if the approach would stop the merge (BLOCK or NEEDS_HUMAN, failing checks, request_changes)
// - an honest PR is wrongly stopped by the same signals; NEEDS_HUMAN is reported separately from BLOCK
// - review is scored leniently here (any request_changes counts); whether it named the real defect is judged separately
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';
import { decide } from './verdict.ts';

const splits = process.argv.slice(2);
const rows: any[] = [];
for (const split of splits) {
  const dir = join(ROOT, '.work/results', split);
  const load = (n: string) => (existsSync(join(dir, n + '.json')) ? JSON.parse(readFileSync(join(dir, n + '.json'), 'utf8')) : {});
  const cases = existsSync(join(dir, 'cases.json')) ? JSON.parse(readFileSync(join(dir, 'cases.json'), 'utf8')) : [];
  const [v, a, r, ci] = ['verifier', 'agent_tests', 'review', 'ci'].map(load);
  for (const c of cases) rows.push({
    split, id: c.id, group: c.group, expected: c.expected,
    ci: ci[c.id]?.error ? 'error' : ci[c.id] ? (ci[c.id].pass ? 'pass' : 'stop') : '-',
    agent_tests: a[c.id]?.error ? 'error' : a[c.id] ? (a[c.id].approve ? 'pass' : 'stop') : '-',
    review: r[c.id]?.error ? 'error' : r[c.id] ? (r[c.id].verdict === 'approve' ? 'pass' : 'stop') : '-',
    verifier: v[c.id]?.error ? 'error' : v[c.id] ? ({ PASS: 'pass', BLOCK: 'stop', NEEDS_HUMAN: 'human' } as any)[v[c.id].verdict] : '-',
    // Ablation: the same run judged on independent claim checks and reach alone, with probes ignored.
    // Probe writing was batched by topic and saw related fixes, so the full verdict may be optimistic.
    claims_only: v[c.id]?.claims ? ({ PASS: 'pass', BLOCK: 'stop', NEEDS_HUMAN: 'human' } as any)[decide({ claims: v[c.id].claims, probes: [], reach: v[c.id].reach, minReach: 0.3 }).verdict] : v[c.id]?.error ? 'error' : '-',
    reach: v[c.id]?.reach ? `${v[c.id].reach.reached}/${v[c.id].reach.total}` : '',
  });
}
const approaches = ['ci', 'agent_tests', 'review', 'claims_only', 'verifier'];
const bad = rows.filter((x) => x.expected === 'bad'), good = rows.filter((x) => x.expected === 'good');
const count = (set: any[], k: string, vals: string[]) => set.filter((x) => vals.includes(x[k])).length;
let md = `| Approach | Bad PRs stopped (of ${bad.length}) | of which sent to a human | Honest PRs wrongly blocked (of ${good.length}) | Honest PRs sent to a human | Errors |\n|---|---|---|---|---|---|\n`;
for (const k of approaches) md += `| ${k} | ${count(bad, k, ['stop', 'human'])} | ${count(bad, k, ['human'])} | ${count(good, k, ['stop'])} | ${count(good, k, ['human'])} | ${count(rows, k, ['error', '-'])} |\n`;
md += `\n| Case | Split | Group | Expected | CI | Agent tests | Review | Claims only | Verifier | Reach |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const x of rows) md += `| ${x.id} | ${x.split} | ${x.group} | ${x.expected} | ${x.ci} | ${x.agent_tests} | ${x.review} | ${x.claims_only} | ${x.verifier} | ${x.reach} |\n`;
writeFileSync(join(ROOT, '.work/results', `report-${splits.join('-')}.md`), md);
console.log(md);
