# Verifier

An independent check for AI-written PRs. It takes approved claims about behaviour, writes black-box tests without seeing the code, runs them on the old and new versions in a sandbox, and returns PASS, BLOCK or NEEDS_HUMAN with evidence.

**Status:** benchmarked on 20 PocketBase PRs: it stopped 10 of 12 bad PRs that CI let through, and let 1 of 8 honest fixes straight through (see [results/summary.md](results/summary.md)). The PR page and GitHub status path are not yet tested end to end.

## How it decides

- A claim counts as proven only if its check fails on the old version and passes on the new one.
- Probes exercise code near the diff on both versions, and differences get compared mechanically.
- Go coverage shows which changed statements no check reached.
- Checks that give unstable results across repeat runs don't count as evidence.

## Run it

Needs Docker and Node 23+. No install step.

```bash
node --test --no-warnings src/verdict.test.ts
```

```bash
export MODEL_API_KEY=your_key_here
```

```bash
node --no-warnings src/server.ts --case h-bearer
```

Without `MODEL_API_KEY`, the model step reads saved answers from `.work/gen`, and the run stops if one is missing. The benchmark also expects a PocketBase clone at `.work/repos/pocketbase`.

## Layout

- `src/pipeline.ts`: the procedure, from claims to verdict
- `src/prompts.ts`: what each role can see. The test writer has no input for code.
- `src/verdict.ts`: decision logic with no model and no I/O
- `src/sandbox.ts`, `src/runner.mjs`: containers without internet access and the HTTP check runner
- `src/benchmark.ts`, `cases/`: comparison against existing CI, agent-written tests and LLM review
- `src/simulate.ts`: agents standing in for the engineer at each human step, to measure cognitive load
- `src/metrics.ts`, `docs/metrics.md`: catch rate, defects that would merge, false alarms, tokens and developer effort from benchmark results
- `src/server.ts`, `src/github.ts`, `ui/`: per-PR page and commit status
- `docs/claims-contract.md`: the hand-off from the tests-first conversation

Sample cases come from [PocketBase](https://github.com/pocketbase/pocketbase) (MIT).
