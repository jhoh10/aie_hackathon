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
- **What we're building:** a verification-first harness for coding agents. The engineer and the agent agree on inputs, outputs and a test plan before any code is written, and the agent isn't done until the approved tests pass. Details in [verification-first-harness/](verification-first-harness/README.md).
- **Demo moment:** _The one thing judges should see that makes them go "oh nice"._

We picked idea 1 from [docs/ideas.md](docs/ideas.md).

## Status

- What's in flight right now: [TASKS.md](TASKS.md)
- Running log of what happened and when: [docs/log.md](docs/log.md)
- Decisions and why we made them: [docs/decisions.md](docs/decisions.md)
- Submission checklist: [docs/submission.md](docs/submission.md)

## Running it

_TBD once we pick a stack._

```bash
# install
# run
```

Secrets go in `.env` (git-ignored). List the variable names, never the values, in `.env.example`.

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
