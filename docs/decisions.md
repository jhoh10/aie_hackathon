# Decisions

One entry per real choice. Newest first. These are handy when writing the pitch ("we chose X because...").

<!-- Copy this block for each new decision:

## YYYY-MM-DD: <what we decided>

- **Chose:**
- **Over:**
- **Because:**
- **Revisit if:**

-->

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
