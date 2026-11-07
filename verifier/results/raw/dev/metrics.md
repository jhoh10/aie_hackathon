| Approach | Cases | Defects caught | Defects merged | False alarms | Tokens / case | Dev minutes / case | Wall seconds (median) |
|---|---|---|---|---|---|---|---|
| verifier | 8 | 4 (80%) | 1 | 2 (67%) | 14115~ | 5.4 | 109.2 |
| agent_tests | 8 | 3 (60%) | 2 | 2 (67%) | 2498~ | 3.3 | 13.8 |
| review | 8 | 5 (100%) | 0 | 0 (0%) | 1242~ | 3.3 | 0.1 |
| ci | 8 | 0 (0%) | 5 | 0 (0%) | n/a | 3.3 | 51.5 |

~ token counts estimated at 4 characters per token. Minutes use the assumptions in src/metrics.ts.

Verifier wall seconds by stage (median): claims 0, write_checks 0, build 2.6, run_checks 87, coverage 17.3, triage 0, total 109.2

Simulated engineer: cognitive load at each human step (medians)

| Step | Cases | Tokens read | Effort (1-9) | Evidence opened | Right decisions | Defects merged |
|---|---|---|---|---|---|---|
| Today: review the diff | 8 | 699 | 3 | n/a | 8/8 | 0 |
| Ours: approve claims | 8 | 344.5 | 3 | n/a | n/a (2 edited) | n/a |
| Ours: review the verdict | 8 | 1568 | 3 | 1 | 6/8 | 2 |

Per change, on 8 cases with both flows: today reads 699 tokens at effort 3; ours reads 1911.5 tokens at total effort 6 over two steps. Reading reduced 0.4x.

