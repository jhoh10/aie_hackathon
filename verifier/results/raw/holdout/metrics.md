| Approach | Cases | Defects caught | Defects merged | False alarms | Tokens / case | Dev minutes / case | Wall seconds (median) |
|---|---|---|---|---|---|---|---|
| verifier | 12 | 6 (86%) | 1 | 5 (100%) | 13489~ | 6.6 | 19.9 |
| agent_tests | 12 | 7 (100%) | 0 | 1 (20%) | 2732~ | 6.7 | 2.6 |
| review | 12 | 7 (100%) | 0 | 0 (0%) | 1393~ | 6.7 | 0.1 |
| ci | 12 | 0 (0%) | 7 | 1 (20%) | n/a | 6.7 | 54.6 |

~ token counts estimated at 4 characters per token. Minutes use the assumptions in src/metrics.ts.

Verifier wall seconds by stage (median): claims 0, write_checks 0, build 0.1, run_checks 15.9, coverage 4.4, triage 0, total 19.9

Simulated engineer: cognitive load at each human step (medians)

| Step | Cases | Tokens read | Effort (1-9) | Evidence opened | Right decisions | Defects merged |
|---|---|---|---|---|---|---|
| Today: review the diff | 12 | 575 | 4 | n/a | 12/12 | 0 |
| Ours: approve claims | 12 | 340.5 | 3 | n/a | n/a (2 edited) | n/a |
| Ours: review the verdict | 12 | 1521.5 | 3.5 | 1 | 5/12 | 4 |

Per change, on 12 cases with both flows: today reads 575 tokens at effort 4; ours reads 1823.5 tokens at total effort 6.5 over two steps. Reading reduced 0.3x.

