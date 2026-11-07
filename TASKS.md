# Tasks

One line per task. Put the owner's initials in brackets. Move lines between sections as they progress; don't delete finished ones.

## Milestones (Sat Nov 7, PST)

Planned backwards from the **5:00 PM PT submission deadline** (from the CV page, see docs/submission.md). First-round judging is 5:00–6:45 PM, with a live demo of about 3 minutes plus Q&A. Shifted an hour earlier at 1:40 PM, when we learned the deadline was 5:00, not 6:00. Tick each milestone as you hit it.

- [x] **11:45 AM: idea locked, roles split.** Idea 1 picked, owners below, deadline confirmed.
- [ ] **12:30 PM: stack and skeleton (overdue, nearly done).** "Running it" in the README filled in and the verifier wired to Muse Spark. Left: Meta billing (key accepted, but chat calls return 402 `billing_not_configured`).
- [ ] **1:30 PM: hello world end to end (done with hand-written checks).** Harness side done: DT ran plan → approval → build → report on two SWE-bench tasks (verification-first-developer-harness/evaluation/). Hand-off done: `src/handoff.ts` runs an approved plan through the verifier, PASS on `h-bearer` (verification-first-developer-harness/README.md, "End to end"). Still missing: the real model instead of hand-written answers (blocked on Meta billing), and the demo scenario named in the README's "Demo moment".
- [ ] **2:00 PM: benchmark running (started, handed to SB at 2:20).** A first dev run got partway on Jon's machine; see SB's Now line for what's left.
- [ ] **3:00 PM: demo moment works.** The live scenario runs reliably, using the Meta API if we have keys. If it isn't working by now, cut scope; don't move the freeze.
- [ ] **3:30 PM: numbers in.** The 2–3 benchmark numbers that go in the demo are picked. They support the demo; a dashboard can't be the main feature (disqualifier). Also the reviewer harness checkpoint: if it isn't working by now, show it as a short walkthrough on top of the verifier results, not as an evaluated component.
- [ ] **4:00 PM: feature freeze.** Only bug fixes after this. Demo script written, slides started.
- [ ] **4:30 PM: demo assets.** One-minute demo video recorded, slides done, README has the pitch, team and how to run it.
- [ ] **4:45 PM: submitted.** Public repo, video, every member on the submission page. 15 minutes of buffer.
- [ ] **4:45–5:00 PM: rehearse.** Run the 3-minute live demo twice.

## Who's on what

- **DT (Deepak):** core product: the developer harness (renamed at 2:23 PM) and, next, the reviewer harness
- **SB (Sebastian):** evals, and datasets we can use
- **JH (Jon):** metrics
- **MA (Mauricio):** research on Lean for software verification
- **Unowned:** demo, pitch and submission; event details. Pick these up when your own workstream allows.

Focus for the rest of the day (2:25 PM): so far we've built for the developer making the change. What's left is the **reviewer experience**, **evals for the numbers**, and **demo materials**. Evals don't wait for the reviewer harness: the verifier runs, the developer harness numbers and the simulated reviewer load can all run now. Only reviewer-harness-specific numbers wait for it.

## Now

- [ ] [DT] Reviewer harness: scoped in docs/decisions.md and first version built (verification-first-reviewer-harness/, with a real pylint-8898 example). Next: show the packet on the verifier PR page next to the verdict, and measure it against a raw-diff review. Checkpoint at 3:30 PM.
- [ ] [DT, SB] Pick the demo scenario: the repo, the change and the tests the harness turns green live. **Overdue, blocks demo materials**; `h-bearer` already works by hand. In both SWE-bench runs both sides resolved the bug and the harness cost 1.5–3× more, so the demo needs a case where the default agent ships something wrong and we catch it (for example an `r-*` revert case).
- [ ] **Everyone: claim the $100 Meta credits before 3:00 PM PT** (form on the CV details page; needs billing set up at dev.meta.ai and your Team ID, see resources/sponsors.md). Billing setup is likely also the fix for our 402 `billing_not_configured`. Without it the Meta prize story and the "real model" claim are weak.
- [x] [SB] Evals and dataset: 20 PocketBase PRs (8 real fixes, 4 reverts, 8 authored bad PRs), see verifier/cases/README.md (2026-11-07)
- [ ] [SB] Verifier: test the PR page and GitHub status end to end (not tried yet)
- [ ] [SB, JH] Run the 19 new `extended` cases (verifier/cases/README.md): `node src/benchmark.ts extended`, after the holdout run. CI step done (19/19 pass, reverts included), so run `verifier`, `agent_tests`, `review`, `sim`. Report extended next to holdout if it finishes by 3:30 PM.
- [ ] [DT, JH] Run the developer-side eval (verification-first-developer-harness/evaluation/pocketbase/README.md): `node --no-warnings run.ts all both`, then `--report` and mark "surfaced the open question" by hand. Graders checked; no agent runs yet. Try `number both` first (about 10 min).
- [ ] [SB] Commit the raw benchmark results (`verifier/.work/results/dev`, `holdout` and the `.usage.json` files from `.work/gen`) under `verifier/results/raw/`, so `metrics.ts` can run on any machine. Today they exist only on Sebastian's machine, which is why tokens (metric 4) and wall time (6) aren't reported.
- [ ] [SB, JH] Run the simulated engineer: `node src/benchmark.ts dev sim` and `holdout sim` (needs `verifier.json` from that split and a model). It has never run, so metric 5 (reviewer load: tokens read and effort, today vs ours) has no numbers. That's our best answer to "AI review already catches 12 of 12".
- [ ] [JH] Metrics (AIE-5): what we measure and show the judges. Definitions, script, wall time and simulated-engineer load done (verifier/docs/metrics.md, `node src/metrics.ts dev`). Next: run on real benchmark results and pick what goes in the demo. Candidates: developer harness lean vs default (cost $0.42 vs $0.74, time 1.3 vs 2.5 min, words read), BLOCK on the revert cases, and reviewer load from `simulate.ts` (claims plus verifier summary vs reading the diff). That last one is the reviewer-experience number and can run before the reviewer harness exists.
- [ ] [MA] Research Lean for software verification. Decide **now** (was due 1:30 PM) whether it goes in the demo or becomes a "what's next" slide.

## Next

- [ ] Run the hand-off with the real model (needs Meta billing fixed: the key gets 402 `billing_not_configured`), so the h-bearer checks aren't hand-written
- [ ] Run the hand-off on a bad case (an `r-*` revert) to show BLOCK end to end; needs a plan.md for that case
- [ ] [DT] Get Meta Model API keys for everyone (the $5k prize track)
- [ ] Reviewer harness evals: once it works, add its own numbers next to the simulated reviewer load (only if it's working by 3:30 PM)
- [ ] Check docs, the README and the pitch say "developer harness" and "reviewer harness" consistently after the rename
- [ ] [SB, JH] Agree on the boundary between evals and metrics (for example datasets and graders vs the numbers we show) so no one builds the same thing twice
- [ ] Decide how evals, metrics and Lean show up in the product or the demo
- [ ] Load the claims review page from a real `.verify/plan.md` instead of built-in examples; add `category` and evidence `strength` to the plan template so the agent fills them in phase C
- [ ] Plan and report view: one tree that scales from bug fix to feature (verification-first-developer-harness/display-scaling.md). Needs the `group` field from the claims contract
- [ ] Make the Meta Model API use visible in the demo and the pitch
- [ ] Optional, after Meta works: Gemini as a second, independent checker on verdicts
- [ ] Revisit SubQ: it has its own $5k track and gives 100M free tokens at console.subq.ai, so access isn't the blocker we assumed. Decide whether to add it as a whole-PR checker (docs/decisions.md)
- [ ] Write the demo script (docs/submission.md)
- [ ] Slides, plus a backup demo video
- [ ] Fill in the README pitch, team and links, then submit the form (every member listed, repo accessible to judges)

## Blocked

- [ ] [DT] Meta Model API chat calls: waiting on billing for the Meta team (dev.meta.ai/billing). The key lists models fine; `POST /v1/chat/completions` returns 402 `billing_not_configured`. Ask Meta on site for hackathon credits. Until then the verifier uses saved answers (`MODEL=files` or no key).

## Done

- [x] [DT] Make the harness runnable from the repo: the SWE-bench side-by-side simulation is in sim/ (run.py, viewer.py, summary.py, README), and "Running it" shows the harness and review prompts (2026-11-07)
- [x] [SB] Benchmark run on all 20 cases against CI, implementer tests and AI review; results in verifier/results/summary.md (2026-11-07)
- [x] [SB] Presentation graphics: 6-slide deck and results diagrams, sources in presentation/ (2026-11-07)
- [x] [DT] Rename the harness to the developer harness (verification-first-developer-harness/), links and paths updated (2026-11-07)
- [x] [MA] Claims review page: claims grouped by guarantee category per use case (bug fix, feature, refactor, Lean), evidence strength per check, routine regression collapsible, approve per claim → verifier JSON (verification-first-developer-harness/ui/plan-review.html) (2026-11-07)
- [x] [JH] Hand the harness's approved claims to the verifier: `verifier/src/handoff.ts` turns `.verify/plan.md` into claims JSON and runs the verifier. PASS on `h-bearer` (checks hand-written, Meta billing blocked) (2026-11-07)
- [x] Verifier model step points at Muse Spark (`muse-spark-1.3`, `https://api.meta.ai/v1`), reads `META_API_KEY`; "Running it" in the README filled in (2026-11-07)
- [x] [DT] Harness run end to end on two SWE-bench Verified tasks (sympy-24661, pylint-8898), side by side with default Claude Code; both sides resolved both (2026-11-07)
- [x] Confirm the real deadline: 5:00 PM PT, milestones shifted to match (2026-11-07)
- [x] [JH] Write up how the harness display scales with task size (2026-11-07)
- [x] Pick the idea: idea 1, verification-first harness (2026-11-07)
- [x] [SB] Verifier core pipeline written, not yet benchmarked (2026-11-07)
- [x] [SB] Add deadline, judging criteria and disqualifiers to docs/submission.md (2026-11-07)
- [x] [JH] Copy schedule, rules, problem statements and full prize list from the CV details page into resources/event.md (2026-11-07)
- [x] [JH] Decide on Muse Code: demo stays in Claude Code, Meta is the verifier's model (docs/decisions.md) (2026-11-07)
- [x] [JH] Add resources folder with event and sponsor info (2026-11-07)
- [x] [JH] Invite collaborators (2026-11-07)
- [x] [JH] Create the repo (2026-11-07)
