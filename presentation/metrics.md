# Metrics: all results in one place

Every number we measured, with where it comes from. The definitions are in [verifier/docs/metrics.md](../verifier/docs/metrics.md). One run per case and arm, all models are Claude (the Meta Model API wasn't billable yet), so these show a direction, not significance.

## Headline

- **The developer harness builds the right thing on ambiguous issues.** On 7 real PocketBase issues that leave a design decision open, it passed the hidden upstream tests **7 of 7**, against **5 of 7** for default Claude Code. It settled the open question in its plan before writing code on 7 of 7; the default agent did on 0 of 7. It costs about 2.6× more.
- **Green CI isn't evidence.** Across 12 bad PRs, the project's own CI stopped **0**. The verifier stopped **10**, with evidence anyone can rerun.
- **Where we fall short:** the verifier let only 1 of 8 honest PRs through, and plain AI review of the diff did better on this set (12 of 12 bad PRs stopped, 8 of 8 honest PRs passed).

## Developer side: before any PR exists

### Metric 9: built the right thing

10 PocketBase issues, default Claude Code vs the harness, with a simulated engineer answering the harness's questions. Graded by the upstream fix's own tests. Source: [results/report.md](../verification-first-developer-harness/evaluation/pocketbase/results/report.md).

| Tasks | Arm | Hidden tests passed | Settled the open question first | Total cost | Median time |
|---|---|---|---|---|---|
| 7 ambiguous | Default | 5 of 7 | 0 of 7 | $3.89 | 1.9 min |
| 7 ambiguous | Harness | **7 of 7** | **7 of 7** | $10.17 | 2.5 min |
| 3 clear (controls) | Default | 2 of 3 | n/a | $1.66 | 1.7 min |
| 3 clear (controls) | Harness | 2 of 3 | n/a | $4.22 | 2.4 min |

- The default agent failed `idchars` (it guessed its own list of forbidden id characters) and `oauth` (it matched providers the wrong way). In both cases the harness put the decision in its plan, and the engineer could correct it before any code was written.
- `cascade` (a control) failed on both sides, so the harness bought nothing on clear tasks.
- The engineer's effort: 1 reply per harness task (2 on `oauth`), and about 250–560 words read, against 70–310 words with the default agent.

### Metric 8: harness overhead

pylint-8898 from SWE-bench Verified, 3 runs per side. Source: [docs/log.md](../docs/log.md).

| | Cost | Time | Words the engineer reads |
|---|---|---|---|
| Lean harness | $0.42 | 1.3 min | 280 |
| Default agent | $0.74 | 2.5 min | n/a |

This task's hidden test rewards one specific design and 8 of 9 runs failed it on every side, so this shows cost, not quality.

## PR side: the verifier

20 PocketBase PRs: 8 honest upstream fixes, 4 reverted fixes, 8 bad PRs written by a separate agent. Source: [verifier/results/summary.md](../verifier/results/summary.md) and [verifier/results/raw/](../verifier/results/raw/).

### Metrics 1–3: defects caught, defects that would merge, false alarms

| Approach | Bad PRs stopped (of 12) | Honest PRs let through (of 8) |
|---|---|---|
| Existing CI | 0 | 7 |
| Implementer's own tests | 10 | 5 |
| AI review of the diff | 12 | 8 |
| Verifier | 10 (6 blocked, 4 to a person) | 1 (3 wrongly blocked, 4 to a person) |

- The verifier stopped all 3 PRs built to game the checks.
- It missed `r-secret` and `r-smtp`, whose bugs aren't visible over HTTP.
- Wrong blocks: `h-oauth` and `h-index` had real side effects their issues never mention; `h-view` was a bad generated check.

### Metrics 4 and 6: tokens and wall time per case

| Approach | Tokens per case (dev / held-out) | Median wall time (dev / held-out) |
|---|---|---|
| Verifier | ~14,100 / ~13,500 | 109 s / 20 s |
| Implementer's tests | ~2,500 / ~2,700 | 14 s / 3 s |
| AI review | ~1,240 / ~1,390 | 0.1 s / 0.1 s |
| CI | none | 52 s / 55 s |

Tokens are estimated at 4 characters per token. Most of the verifier's time is running every check twice on both versions. The held-out run had Docker images and model answers cached.

### Metric 5: reviewer load, on a simulated engineer

Claude agents stood in for the engineer at each human step. Today's flow is reading the diff; ours is approving the claims, then reading the verdict.

| Split | Flow | Tokens read | Effort (1–9) | Right decisions | Bad PRs merged |
|---|---|---|---|---|---|
| Dev (8) | Today | 699 | 3 | 8 of 8 | 0 |
| Dev (8) | Ours | 1,912 | 6 (two steps) | 6 of 8 | 2 |
| Held-out (12) | Today | 575 | 4 | 12 of 12 | 0 |
| Held-out (12) | Ours | 1,824 | 6.5 (two steps) | 5 of 12 | 4 |

This went against us: the summary plus opened evidence outweighed small diffs, and claims that pass on both versions read as reassuring. Caveat: the verdict reviewer could see the diff reviewer's decision in the log.

### Metric 7: evidence quality

Changed code reached by the verifier's checks: 100% on 13 of 19 scored cases, and 61–88% on the rest (per case in [summary.md](../verifier/results/summary.md)).

## Not measured yet

- **Extended split:** 19 more cases (10 real fixes, 9 reverts). Only CI has run (19 of 19 pass, reverts included). Running the verifier on them would give a false-alarm rate on 18 honest PRs instead of 8.
- **Reviewer harness:** no numbers of its own yet. One real example: on pylint-8898 it flagged the untested `( )` handling that failed the hidden test.
- **Real people:** all effort figures come from simulated engineers or modelled reading speeds.
