# Decisions

One entry per real choice. Newest first. These are handy when writing the pitch ("we chose X because...").

<!-- Copy this block for each new decision:

## YYYY-MM-DD: <what we decided>

- **Chose:**
- **Over:**
- **Because:**
- **Revisit if:**

-->

## 2026-11-07: Push straight to main, no PRs

- **Chose:** everyone commits and pushes directly to `main`; changes that go against the rest of the repo get flagged before pushing.
- **Over:** feature branches with PR review.
- **Because:** speed matters more than process at a hackathon, and the flag-first rule keeps the team aligned on anything surprising.
- **Revisit if:** we keep clobbering each other's work on main.

## 2026-11-07: Build idea 1, the verification-first harness

- **Chose:** Idea 1: talk through the tests before writing the code. The agent and the engineer agree on inputs, outputs and the test plan first, then the agent builds until the approved tests pass (verification-first-harness/).
- **Over:** Idea 2: the LLM picks the lines worth reviewing.
- **Because:** The team settled on it. It fits the "verification" theme directly and has already been worked out furthest (five-phase conversation, testing catalog, templates).
- **Revisit if:** The core loop (approved plan → build → green report) isn't working end to end by the 2:30 PM milestone.

## 2026-11-07: The engineer approves the tests only, not the architecture

- **Chose:** one human gate in the verification-first harness: the test and verification plan. The agent chooses the code and architecture itself and records them as design notes in the verification report.
- **Over:** a second gate where the engineer approves the architecture before the agent builds.
- **Because:** it fits the core belief that code is a black box. The engineer's attention goes on what "done" means and how it's proven; anything they care about in how it's built (performance, dependencies, reuse) goes into the plan as a check.
- **Revisit if:** agents keep producing designs the team rejects in review even when every check passes.

## 2026-11-07: Verifier runs as a required PR status, outside the repo under test

- **Chose:** a separate service that polls PRs and posts a commit status.
- **Over:** pre-commit hooks and a GitHub Action in the same repo.
- **Because:** hooks can be skipped, and a PR could edit its own workflow. Polling also avoids needing a public webhook on venue Wi-Fi.
- **Revisit if:** we need webhooks for speed.

## 2026-11-07: PocketBase as the sample project

- **Chose:** PocketBase (MIT, Go, single binary, SQLite, real HTTP API).
- **Over:** our own demo app and larger apps such as Gitea.
- **Because:** real fix history answers "you planted those bugs", and it runs in a sealed container.
- **Revisit if:** build times eat too much of the day.
