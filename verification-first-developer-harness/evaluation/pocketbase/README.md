# Developer-side eval: does setting the work up our way build the right thing?

The verifier benchmark (`verifier/cases/`) asks whether a finished PR should merge. This eval asks the earlier question: given only an issue, does the developer harness (questions, claims, one approval) end with a better change than default Claude Code?

Our expectation, from the two SWE-bench side-by-sides: on a clear issue both agents succeed and the harness just costs more. The harness should win only when the issue leaves a real decision open. So 7 of the 10 tasks are **ambiguous** and 3 are **controls** (clear issues), which show the overhead honestly.

## The tasks

[tasks.json](tasks.json): 10 real PocketBase bug fixes. For each one:

- **issue:** all the agent sees, at the commit before the upstream fix.
- **brief:** what the engineer actually wants, written from the upstream fix in behaviour terms. Only the simulated engineer sees it.
- **ambiguity:** the decision the issue leaves open, used only for scoring.
- **Hidden grader:** the upstream fix's own test functions, applied on top of the agent's change. `run.ts --check-graders` checks that each one fails before the fix and passes after it.

| Task | Kind | Open question |
|---|---|---|
| number | ambiguous | Does a max of 0 mean "unset" or a real limit? |
| oauth | ambiguous | Merge or replace providers, matched how, and what about fields that weren't sent? |
| idchars | ambiguous | Which id characters and reserved names are forbidden, and how strictly? |
| refresh | ambiguous | Refresh an impersonate token, return it as-is, or keep failing? |
| redirect | ambiguous | Make redirectURL optional, and do other fields stay required? |
| realtime | ambiguous | Who gets hidden fields in realtime events? |
| onlyint | ambiguous | Which view expressions are known to be integer-only? |
| bearer | control | none |
| excerpt | control | none |
| cascade | control | none (the work is in the implementation) |

Not used, and why: identity (the upstream test already passes on the unfixed code), smtp and view (their tests compare exact output, so only upstream's implementation passes). For oauth, only the API-level test grades, because upstream also unit-tests a method a correct fix elsewhere wouldn't have.

## The two arms

Same model, same prompt (the issue plus one line saying `go` runs in Docker), same working copy:

- **default:** `claude -p`.
- **harness:** `claude -p --append-system-prompt <harness-prompt.md>`.

Whenever an agent stops on a question or asks for approval, the **simulated engineer** replies ([engineer-prompt.md](engineer-prompt.md), at most 3 replies). It answers only what it's asked or what the plan gets wrong, never recites the brief, and never mentions code. That's the fair comparison: both arms have the same engineer, but only an agent that asks gets answers. If the default agent never asks, the engineer never speaks.

## Running it

Needs Docker, the `claude` CLI and the PocketBase clone at `verifier/.work/repos/pocketbase` (see the verifier README). From this folder:

```bash
node --no-warnings run.ts all --check-graders
node --no-warnings run.ts number both
node --no-warnings run.ts all both
node --no-warnings run.ts all --report
```

- Each agent works in its own git worktree under `.work/<task>/<arm>/` (ignored). The `go` command there is a shim that runs in Docker.
- Agents run with `--permission-mode acceptEdits` and Bash, Read, Edit, Write, Grep and Glob allowed, capped at $5 per call. Bash is not sandboxed: they run on your machine, inside their worktree.
- Results go to `results/<task>-<arm>.json`: hidden-test result, agent cost and time, engineer replies, words the engineer read, diff size and the full transcript. `--report` writes `results/report.md`.
- Roughly 5–15 minutes and $1–4 per task and arm; Go tests in Docker are the slow part.

## Scoring

1. **Built the right thing:** hidden tests pass, split into ambiguous and control tasks.
2. **Surfaced the open question:** did the agent ask about it, or decide it explicitly in its plan? Marked by hand in `report.md`, against each task's `ambiguity`.
3. **Engineer effort:** replies and words read.
4. **Cost and time** per arm.

The claim we hope to show is "on ambiguous issues the harness asks the question that decides the fix, and passes where the default agent guesses wrong", next to an honest cost on the controls.

## Limits

- 10 tasks and one run per arm: a pattern to show, not a rate to quote. Agent runs vary, so run 3 times per arm before quoting numbers.
- The brief comes from the upstream fix, so "right" means "what PocketBase's maintainer chose". On some tasks another answer would also be reasonable.
- The engineer is simulated, like the reviewer in `verifier/src/simulate.ts`.
