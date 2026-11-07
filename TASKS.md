# Tasks

One line per task. Put the owner's initials in brackets. Move lines between sections as they progress; don't delete finished ones.

## Milestones (Sat Nov 7, PST)

Planned backwards from the **5:00 PM PT submission deadline** (from the CV page, see docs/submission.md). First-round judging is 5:00–6:45 PM, with a live demo of about 3 minutes plus Q&A. Shifted an hour earlier at 1:40 PM, when we learned the deadline was 5:00, not 6:00. Tick each milestone as you hit it.

- [x] **11:45 AM: idea locked, roles split.** Idea 1 picked, owners below, deadline confirmed.
- [ ] **12:30 PM: stack and skeleton (overdue, nearly done).** "Running it" in the README filled in and the verifier wired to Muse Spark. Left: Meta billing (key accepted, but chat calls return 402 `billing_not_configured`).
- [ ] **1:30 PM: hello world end to end (done with hand-written checks).** Harness side done: DT ran plan → approval → build → report on two SWE-bench tasks (verification-first-harness/evaluation/). Hand-off done: `src/handoff.ts` runs an approved plan through the verifier, PASS on `h-bearer` (verification-first-harness/README.md, "End to end"). Still missing: the real model instead of hand-written answers (blocked on Meta billing), and the demo scenario named in the README's "Demo moment".
- [ ] **2:00 PM: benchmark running.** `node src/benchmark.ts dev verifier` started on the real dev cases. The first run will need debugging, so allow 1–2 hours. Holdout is optional.
- [ ] **3:00 PM: demo moment works.** The live scenario runs reliably, using the Meta API if we have keys. If it isn't working by now, cut scope; don't move the freeze.
- [ ] **3:30 PM: numbers in.** The 2–3 benchmark numbers that go in the demo are picked. They support the demo; a dashboard can't be the main feature (disqualifier).
- [ ] **4:00 PM: feature freeze.** Only bug fixes after this. Demo script written, slides started.
- [ ] **4:30 PM: demo assets.** One-minute demo video recorded, slides done, README has the pitch, team and how to run it.
- [ ] **4:45 PM: submitted.** Public repo, video, every member on the submission page. 15 minutes of buffer.
- [ ] **4:45–5:00 PM: rehearse.** Run the 3-minute live demo twice.

## Who's on what

- **DT (Deepak):** core product: the harness itself
- **SB (Sebastian):** evals, and datasets we can use
- **JH (Jon):** metrics
- **MA (Mauricio):** research on Lean for software verification
- **Unowned:** demo, pitch and submission; event details. Pick these up when your own workstream allows.

## Now

- [ ] [DT] Make the harness runnable from the repo: commit how the SWE-bench side-by-side runs were done and fill in "Running it" in the README
- [ ] [SB] Find evals and datasets we can use
- [ ] [SB] Verifier: run the benchmark on PocketBase cases, test the PR page and GitHub status (verifier/)
- [ ] [JH] Metrics (AIE-5): what we measure and show the judges. Definitions, script, wall time and simulated-engineer load done (verifier/docs/metrics.md, `node src/metrics.ts dev`). Next: run on real benchmark results and pick what goes in the demo
- [ ] [MA] Research Lean for software verification. Decide **now** (was due 1:30 PM) whether it goes in the demo or becomes a "what's next" slide.

## Next

- [ ] Copy the schedule and prize breakdown from the CV details page into resources/event.md. Leave out the venue Wi-Fi password, this repo is public.
- [ ] Run the hand-off with the real model (needs Meta billing fixed: the key gets 402 `billing_not_configured`), so the h-bearer checks aren't hand-written
- [ ] Run the hand-off on a bad case (an `r-*` revert) to show BLOCK end to end; needs a plan.md for that case
- [ ] [DT] Get Meta Model API keys for everyone (the $5k prize track)
- [ ] [DT, SB] Pick the demo scenario: the repo, the change and the tests the harness turns green live. **Overdue**; `h-bearer` already works by hand. In both SWE-bench runs both sides resolved the bug and the harness cost 1.5–3× more, so the demo needs a case where the default agent ships something wrong and we catch it (for example an `r-*` revert case).
- [ ] [SB, JH] Agree on the boundary between evals and metrics (for example datasets and graders vs the numbers we show) so no one builds the same thing twice
- [ ] Decide how evals, metrics and Lean show up in the product or the demo
- [ ] Plan and report view: one tree that scales from bug fix to feature (verification-first-harness/display-scaling.md). Needs the `group` field from the claims contract
- [ ] Make the Meta Model API use visible in the demo and the pitch
- [ ] Optional, after Meta works: Gemini as a second, independent checker on verdicts
- [ ] Ask the SubQ team on site for API access (whole-codebase context for verifying a PR)
- [ ] Check the CV details page for the rest of the $11k prize split; revisit the sponsor decision if Fetch.ai, MongoDB or DeepMind has a big track
- [ ] Write the demo script (docs/submission.md)
- [ ] Slides, plus a backup demo video
- [ ] Fill in the README pitch, team and links, then submit the form (every member listed, repo accessible to judges)

## Blocked

- [ ] [DT] Meta Model API chat calls: waiting on billing for the Meta team (dev.meta.ai/billing). The key lists models fine; `POST /v1/chat/completions` returns 402 `billing_not_configured`. Ask Meta on site for hackathon credits. Until then the verifier uses saved answers (`MODEL=files` or no key).

## Done

- [x] [JH] Hand the harness's approved claims to the verifier: `verifier/src/handoff.ts` turns `.verify/plan.md` into claims JSON and runs the verifier. PASS on `h-bearer` (checks hand-written, Meta billing blocked) (2026-11-07)
- [x] Verifier model step points at Muse Spark (`muse-spark-1.3`, `https://api.meta.ai/v1`), reads `META_API_KEY`; "Running it" in the README filled in (2026-11-07)
- [x] [DT] Harness run end to end on two SWE-bench Verified tasks (sympy-24661, pylint-8898), side by side with default Claude Code; both sides resolved both (2026-11-07)
- [x] Confirm the real deadline: 5:00 PM PT, milestones shifted to match (2026-11-07)
- [x] [JH] Write up how the harness display scales with task size (2026-11-07)
- [x] Pick the idea: idea 1, verification-first harness (2026-11-07)
- [x] [SB] Verifier core pipeline written, not yet benchmarked (2026-11-07)
- [x] [SB] Add deadline, judging criteria and disqualifiers to docs/submission.md (2026-11-07)
- [x] [JH] Add resources folder with event and sponsor info (2026-11-07)
- [x] [JH] Invite collaborators (2026-11-07)
- [x] [JH] Create the repo (2026-11-07)
