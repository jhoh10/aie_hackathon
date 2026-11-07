# Metrics

What we measure to show the verifier is worth it, and where each number comes from. Linear: AIE-5.

The benchmark (`src/benchmark.ts`) runs the same PocketBase cases through four approaches: the verifier, agent-written tests, LLM review and the project's own CI. We know which cases are good (honest upstream fixes) and which are bad (reverts and agent-authored defects), so every number below is measured against that known answer.

Run it after a benchmark:

```bash
node --no-warnings src/metrics.ts dev
```

It prints a summary table and writes `.work/results/<split>/metrics.json` with per-approach and per-case detail.

## How a decision is read

| Approach | Approves when | Flags when |
|---|---|---|
| Verifier | verdict is PASS | BLOCK or NEEDS_HUMAN |
| Agent tests | all its own tests pass | any test fails |
| LLM review | `approve` | `request_changes` |
| CI | Go tests pass | Go tests fail |

Runs that errored are counted separately and left out of the rates.

## The metrics

1. **Defects caught at review.** Bad cases the approach flagged, divided by all bad cases it scored. Higher is better.
2. **Defects that would merge.** Bad cases the approach approved. This stands in for errors after merge: we can't watch production, but anything approved here would have shipped. Lower is better.
3. **False alarms.** Good cases the approach flagged, divided by all good cases. A verifier that flags everything would catch every defect, so this keeps catch rate honest.
4. **Tokens used.** Prompt plus completion tokens for each case, counting only the model roles that approach uses:
   - verifier: `claims`, `claim_tests`, `probes`, `triage`
   - agent tests: `agent_tests`
   - review: `review`
   - CI: none

   Token counts come from the API's `usage` field, saved next to each answer as `.work/gen/<case>/<role>.usage.json`. When usage is missing (saved answers, or an endpoint that doesn't report it), we estimate 4 characters per token and mark the number with `~`.
5. **Developer effort (cognitive burden).** The minutes a person spends to be confident in the change, from planning through review.
   - Verifier, planning: reading and approving the claims (word count at 200 words per minute).
   - Verifier, review: half a minute to read a PASS, plus 3 minutes for each BLOCK or NEEDS_HUMAN reason.
   - Every other approach: the person still has to read the diff, at 400 changed lines per hour. Diff size counts non-test Go lines and needs the PocketBase clone at `.work/repos/pocketbase`.

   The minute figures rest on these assumptions (`ASSUME` in `src/metrics.ts`). The raw counts behind them are in `metrics.json` too: number of claims and words approved, NEEDS_HUMAN verdicts, reasons to read and diff lines.

   **Measured on a simulated engineer.** We have no time to collect human data, so agents do the human steps (`src/simulate.ts`, benchmark step `sim`). Each case runs two flows:
   - *Today:* one step. The agent reads the issue and the diff, then decides to merge or block.
   - *Ours:* two steps. The agent approves or edits the claims (planning), then reads the verifier's summary and decides. It can open the evidence for one claim or probe at a time, up to three, and is then made to decide.

   For each step we record:
   - **Tokens read:** what the agent saw by the time it decided, including any evidence it opened, estimated at 4 characters per token.
   - **Effort:** its own rating of mental effort on the 9-point Paas scale, a standard single-question measure.
   - **Evidence opened and turns taken.**
   - **Right decisions:** whether merge or block matched the case's known answer, plus defects merged and good changes blocked.

   Cognitive load per change is the sum over a flow's human steps, compared only on cases that have both flows. The headline numbers are how many times less the engineer reads, and the change in total effort. The simulated engineer never sees a case's known answer or defect note, and its tokens don't count towards any approach's token cost.
6. **Wall time.** How long each approach takes by the clock, per case. The table shows the median; `metrics.json` also has the maximum and the time for every case.
   - Each approach: `wallMs`, saved by the benchmark with every result.
   - Verifier stages: `timings` in each verifier result, in ms: `claims`, `write_checks`, `build`, `run_checks`, `coverage`, `triage` and `total`. The run-checks stage runs every check twice on both versions, so it is usually the largest.
   - People, from live runs on the PR page (`.work/runs/*.json`): time to approve the claims (`claimsReadyAt` to `approvedAt`) and how long the engineer waits for a verdict after approving (`approvedAt` to `doneAt`). These are real times, unlike the modelled minutes in metric 5.
7. **Evidence quality (verifier only).** Claims proven out of all claims, the share of changed statements the tests reached, probes with unstable results, and checks that were inconclusive.

## Developer side: the harness, before any PR exists

Metrics 1–7 judge a finished PR. These two judge the developer harness, which runs earlier: from the issue to the change.

8. **Harness overhead (lean vs default).** Cost, time and words the engineer reads, for the same task with and without the harness. From Deepak's SWE-bench side-by-sides (verification-first-developer-harness/evaluation/), 3 runs each on pylint-8898: lean harness $0.42, 1.3 min, 280 words read; default agent $0.74, 2.5 min. Pass rate doesn't separate the two there (that task's hidden test rewards one specific design, and 8 of 9 runs failed it on every side), so this shows cost only, not quality.
9. **Built the right thing (developer-side eval).** From verification-first-developer-harness/evaluation/pocketbase/ (`run.ts all both`, then `--report`), per task and arm:
   - **Hidden tests pass:** the upstream fix's own test functions, applied on top of the agent's change. Reported separately for the 7 ambiguous and 3 control tasks.
   - **Surfaced the open question:** did the agent ask about the task's `ambiguity`, or decide it explicitly in its plan? Marked by hand in `results/report.md`.
   - **Engineer effort:** replies the simulated engineer gave and words of agent messages it read.
   - **Cost and time:** `total_cost_usd` and wall time from `claude -p`, agent only. The simulated engineer's cost is kept separately.

   The headline we hope for: on ambiguous issues the harness asks the question that decides the fix and passes where the default agent guesses wrong, at a known extra cost on the clear ones. One run per arm shows a pattern, not a rate.

## Limits

- The dev split has 8 cases, so one case moves a rate by 12 points or more. Report counts next to percentages.
- Developer effort (metric 5) is modelled or simulated, not measured on people. An agent's reading and self-rated effort stand in for a person's, so present them as a simulated engineer. Wall time from live runs (metric 6) is the only human measurement, and only for runs on the PR page.
- Wall time is noisy on a laptop and venue Wi-Fi. Model stages take almost no time when answers come from the cache in `.work/gen`, and a Docker build is much slower the first time than once the image exists. Report the median, and say whether models and images were cached.
- Metric 9 grades against what PocketBase's maintainer chose. On some tasks another answer would be reasonable too, which counts against both arms equally.
- 400 lines per hour is a common figure for careful code review. Reading speed for claims is a guess. Both are easy to change.

## In the demo

Show the numbers on the PR page and in the pitch as supporting evidence, next to the verdict. The submission rules disqualify a project whose main feature is a dashboard, so the metrics stay secondary.
