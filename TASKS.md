# Tasks

One line per task. Put the owner's initials in brackets. Move lines between sections as they progress; don't delete finished ones.

## Milestones (Sat Nov 7, PST)

Planned backwards from an **assumed 6:00 PM submission deadline**. Nobody has confirmed the real deadline yet. When someone does, move every time by the same amount. Tick each milestone as you hit it.

- [ ] **12:45 PM: idea locked, roles split.** Idea decided and recorded in docs/decisions.md, every person has an owner line below, real deadline confirmed.
- [ ] **1:30 PM: stack and skeleton.** Stack picked, Meta Model API keys work for everyone, "Running it" in the README filled in.
- [ ] **2:30 PM: hello world end to end.** One request goes input → agent → verification → output, deployed or runnable from a clean clone.
- [ ] **4:00 PM: demo moment works.** The one thing judges should see runs reliably on the demo input, using the Meta API. If it isn't working by now, cut scope; don't move the freeze.
- [ ] **5:00 PM: feature freeze.** Only bug fixes after this. Demo script written, slides started.
- [ ] **5:30 PM: demo assets.** Backup demo video recorded, slides done, README has the pitch and team.
- [ ] **5:45 PM: submitted.** Form in, every member listed, repo accessible to judges. 15 minutes of buffer.
- [ ] **After submitting: rehearse.** Run the pitch twice before demos.

## Who's on what

- **DT (Deepak):** core product: the harness itself
- **SB (Sebastian):** evals, and datasets we can use
- **JH (Jon):** metrics
- **MA (Mauricio):** research on Lean for software verification
- **Unowned:** demo, pitch and submission; event details. Pick these up when your own workstream allows.

## Now

- [ ] [DT] Core product: pick the stack and fill in "Running it" in the README
- [ ] [SB] Find evals and datasets we can use
- [ ] [SB] Verifier: run the benchmark on PocketBase cases, test the PR page and GitHub status (verifier/)
- [ ] [JH] Metrics (AIE-5): what we measure and show the judges. Definitions, script and wall time done (verifier/docs/metrics.md, `node src/metrics.ts dev`). Next: run on real benchmark results and pick what goes in the demo
- [ ] [MA] Research Lean for software verification. Decide by **2:30 PM** whether it goes in the demo or becomes a "what's next" slide.

## Next

- [ ] **Urgent:** confirm the real submission deadline and demo time, then move the milestone times above to match (needs a Cerebral Valley login, about 10 min). docs/submission.md (SB, from the CV page) says **5:00 PM PT**, an hour earlier than the milestones assume.
- [ ] Copy the schedule and prize breakdown from the CV details page into resources/event.md. Leave out the venue Wi-Fi password, this repo is public.
- [ ] Tests-first conversation: output approved claims per verifier/docs/claims-contract.md, so the harness can hand off to the verifier
- [ ] [DT] Get Meta Model API keys for everyone (the $5k prize track)
- [ ] [DT] Get a hello-world version running end to end, using the Meta Model API
- [ ] [DT, SB] Pick the demo scenario: the repo, the change and the tests the harness turns green live. Due by **1:30 PM**.
- [ ] [SB, JH] Agree on the boundary between evals and metrics (for example datasets and graders vs the numbers we show) so no one builds the same thing twice
- [ ] Decide how evals, metrics and Lean show up in the product or the demo
- [ ] Plan and report view: one tree that scales from bug fix to feature (verification-first-harness/display-scaling.md). Needs the `group` field from the claims contract
- [ ] Make the Meta Model API use visible in the demo and the pitch
- [ ] Write the demo script (docs/submission.md)
- [ ] Slides, plus a backup demo video
- [ ] Fill in the README pitch, team and links, then submit the form (every member listed, repo accessible to judges)

## Blocked

_Nothing yet. Say what it's waiting on._

## Done

- [x] [JH] Write up how the harness display scales with task size (2026-11-07)
- [x] Pick the idea: idea 1, verification-first harness (2026-11-07)
- [x] [SB] Verifier core pipeline written, not yet benchmarked (2026-11-07)
- [x] [SB] Add deadline, judging criteria and disqualifiers to docs/submission.md (2026-11-07)
- [x] [JH] Add resources folder with event and sponsor info (2026-11-07)
- [x] [JH] Invite collaborators (2026-11-07)
- [x] [JH] Create the repo (2026-11-07)
