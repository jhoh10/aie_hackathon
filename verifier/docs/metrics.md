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
6. **Evidence quality (verifier only).** Claims proven out of all claims, the share of changed statements the tests reached, probes with unstable results, and checks that were inconclusive.

## Limits

- The dev split has 8 cases, so one case moves a rate by 12 points or more. Report counts next to percentages.
- Effort is modelled, not timed. The server now records `claimsReadyAt`, `approvedAt` and `doneAt` for each run, so a live demo run can show real approval time.
- 400 lines per hour is a common figure for careful code review. Reading speed for claims is a guess. Both are easy to change.

## In the demo

Show the numbers on the PR page and in the pitch as supporting evidence, next to the verdict. The submission rules disqualify a project whose main feature is a dashboard, so the metrics stay secondary.
