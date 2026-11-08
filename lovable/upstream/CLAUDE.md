# CLAUDE.md

This is a hackathon repo. Speed matters more than polish, but the tracking docs must stay current so the team (and the judges) can see what happened.

## Keep these up to date as you work

- **TASKS.md**: when you start, finish or get blocked on something, move its line. Add new tasks you discover.
- **docs/log.md**: add a short entry (newest first) for anything worth remembering: a feature working, a dead end, a pivot. Use the format already in the file.
- **docs/decisions.md**: when we choose between real alternatives (stack, model, API, scope cut), record it.

## Conventions

- Never commit secrets. Keys go in `.env`; add the variable name to `.env.example`.
- Small commits with plain messages ("add upload endpoint", not "wip").
- No PRs: commit and push straight to `main` (pull/rebase first). If a change goes against the rest of the repo (a recorded decision, a convention here, the direction in the docs), flag it to the person you're working with before pushing.
- Prefer the simplest thing that demos well. Ask before adding a big dependency.
