// node src/export.ts > results/per-case.json && node src/summary.ts > results/summary.md
// Summarises per-case outcomes (verdicts already recomputed with the final rules by export.ts).
import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(new URL('../results/per-case.json', import.meta.url), 'utf8'));
const A = [['ci', 'Existing CI'], ['agent_tests', "Implementer's tests"], ['review', 'AI review'], ['claims_only', 'Verifier, claims only'], ['verifier', 'Verifier']];
const bad = r.filter((x: any) => x.expected === 'bad'), good = r.filter((x: any) => x.expected === 'good');
const n = (s: any[], k: string, v: string[]) => s.filter((x) => v.includes(x[k])).length;
let m = `# Benchmark results\n\n20 PocketBase PRs (see ../cases/README.md). Verdicts recomputed from recorded evidence with the final rules. Claude subagents wrote all claims, checks, probes, triage, reviews and implementer tests.\n\n| Approach | Bad PRs stopped (of ${bad.length}) | Blocked | Sent to a person | Honest PRs passed (of ${good.length}) | Wrongly blocked | Sent to a person |\n|---|---|---|---|---|---|---|\n`;
for (const [k, l] of A) m += `| ${l} | ${n(bad, k, ['stop', 'human'])} | ${n(bad, k, ['stop'])} | ${n(bad, k, ['human'])} | ${n(good, k, ['pass'])} | ${n(good, k, ['stop'])} | ${n(good, k, ['human'])} |\n`;
m += `\n| Case | Split | Group | Should | CI | Impl. tests | AI review | Claims only | Verifier | Changed code reached |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const x of r) m += `| ${[x.case, x.split, x.group, x.expected === 'bad' ? 'stop' : 'merge', x.ci, x.agent_tests, x.review, x.claims_only, x.verifier, x.reach_pct == null ? 'n/a' : x.reach_pct + '%'].join(' | ')} |\n`;
m += `\nstop = blocked or failing checks, human = sent to a person, pass = let through.\n`;
process.stdout.write(m);
