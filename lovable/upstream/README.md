# Trust Issues

> AI writes more code than anyone can read. We treat code as a black box: settle the inputs, outputs and tests up front, then verify the result against them.

Team Trust Issues at the AIE Code Summit 2026 Hackathon.

## Team

| Name | Focus | GitHub |
| --- | --- | --- |
| Jonathan Hohrath | Metrics | @jhoh10 |
| Deepak | Core product (the harness) | @deepakiitgcse |
| Sebastian | Evals and datasets | |
| Mauricio | Research: Lean for software verification | |

## The idea

- **Problem:** AI writes more code than anyone can read, so reviewing it line by line doesn't scale.
- **What we're building:** a verification-first harness for coding agents. The engineer and the agent agree on claims (what must be true, in plain language) and the checks that prove them before any code is written, and the agent isn't done until every approved claim is proven. Details in [verification-first-harness/](verification-first-harness/README.md).
- **Demo moment:** _The one thing judges should see that makes them go "oh nice"._

We picked idea 1 from [docs/ideas.md](docs/ideas.md).

## Status

- What's in flight right now: [TASKS.md](TASKS.md)
- Running log of what happened and when: [docs/log.md](docs/log.md)
- Decisions and why we made them: [docs/decisions.md](docs/decisions.md)
- Submission checklist: [docs/submission.md](docs/submission.md)

## Running it

Two parts: the **verifier** (Node, runs checks in Docker) and the **verification-first harness** (a way of running a coding agent, no code of its own yet).

### Prerequisites

- Node 23+ (runs TypeScript directly, no install step and no `npm install`). Tested on Node 26.
- Docker, running. Only needed for real verifier runs and the benchmark, not for the unit tests.
- git.

### Env setup

```bash
cp .env.example .env   # then fill in META_API_KEY
```

- `META_API_KEY`: Meta Model API key (dev.meta.ai). The verifier's model step uses Muse Spark (`muse-spark-1.3`) at `https://api.meta.ai/v1`. `MODEL_API_KEY`, `MODEL_BASE_URL` and `MODEL_NAME` override these for any OpenAI-compatible endpoint.
- No key (or `MODEL=files`): the model step reads saved answers from `verifier/.work/gen/<case>/<role>.json` and writes the prompt next to it, so answers can be produced by hand (for example by Claude) and replayed. The run stops at the first missing answer.
- Node doesn't read `.env` on its own. Pass it with `--env-file=../.env` when running from `verifier/`, as below.
- Status: the key is accepted (`GET /v1/models` returns 200 and lists `muse-spark-1.3`), but chat calls return **402 `billing_not_configured`** until billing is set up on the Meta team at dev.meta.ai/billing.

Secrets go in `.env` (git-ignored). List the variable names, never the values, in `.env.example`.

### Verifier tests

```bash
cd verifier
node --test --no-warnings src/*.test.ts        # all unit tests, no Docker or key needed
node --test --no-warnings src/verdict.test.ts  # just the decision logic
```

### Run one case (untested)

```bash
cd verifier
node --no-warnings --env-file=../.env src/server.ts --case h-bearer
```

Starts the per-PR page on port 4600 (`PORT` to change) for case `h-bearer` from `verifier/cases/manifest.json`. Needs Docker and the PocketBase clone below.

### Benchmark (untested here)

The cases are real PocketBase commits, so the benchmark needs a full clone (not shallow) at `verifier/.work/repos/pocketbase`:

```bash
cd verifier
git clone https://github.com/pocketbase/pocketbase .work/repos/pocketbase
node --no-warnings --env-file=../.env src/benchmark.ts dev verifier
node --no-warnings src/metrics.ts dev           # numbers from the saved results
```

`.work/` is git-ignored. The first run builds a Docker image per case, so expect it to be slow.

### Verification-first harness

There is no CLI. The harness is a way of running a coding agent: [verification-first-harness/README.md](verification-first-harness/README.md) explains it and [conversation.md](verification-first-harness/conversation.md) is the five-phase script (discuss → read code and ask → claims and checks → engineer approves → build until every claim is proven). Deepak ran it by giving Claude Code that script on SWE-bench tasks, then compared it with a plain Claude Code run. The side-by-side reports are in [verification-first-harness/evaluation/](verification-first-harness/evaluation/) (open the HTML files in a browser). To try it, open Claude Code in the target repo, point it at conversation.md and the templates in that folder, and give it the task.

## Repo layout

```
.
├── README.md          # this file: pitch, team, how to run
├── TASKS.md           # now / next / done board
├── CLAUDE.md          # instructions for Claude Code sessions in this repo
├── resources/         # event info, sponsor docs, anything worth linking (add freely)
└── docs/
    ├── ideas.md       # idea backlog and scoring
    ├── log.md         # timestamped progress log (newest first)
    ├── decisions.md   # what we chose, why, what we passed on
    └── submission.md  # everything needed to submit
```

## Links

- Hackathon page: https://cerebralvalley.ai/e/aie-code-2026-hackathon (logistics, theme and prizes summarized in [resources/event.md](resources/event.md))
- Sponsor docs: [resources/sponsors.md](resources/sponsors.md)
- Submission form:
- Demo video:
- Slides:
- Deployed app:
