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
- **Unowned:** demo scenario, demo script, slides, video, README pitch and submission. See "Open: pick one up" under Now.

Focus for the rest of the day (2:25 PM): so far we've built for the developer making the change. What's left is the **reviewer experience**, **evals for the numbers**, and **demo materials**. Evals don't wait for the reviewer harness: the verifier runs, the developer harness numbers and the simulated reviewer load can all run now. Only reviewer-harness-specific numbers wait for it.

## Now

Updated 3:40 PM. **Open work is in "Open: pick one up", most urgent first.** Put your initials on a line before you start it, and push straight away so no one doubles up.

### In progress

- [ ] [DT] Reviewer harness: scoped in docs/decisions.md and first version built (verification-first-reviewer-harness/, real pylint-8898 example plus three more). Next: show the packet on the verifier PR page next to the verdict, and measure it against a raw-diff review. Checkpoint was 3:30 PM.
- [ ] [SB] Commit the raw benchmark results (`verifier/.work/results/dev`, `holdout` and the `.usage.json` files from `.work/gen`) under `verifier/results/raw/`, so `metrics.ts` can run on any machine. Without them, tokens (metric 4) and wall time (6) aren't reported.
- [ ] [SB] Run the simulated engineer: `node src/benchmark.ts dev sim` and `holdout sim` (needs `verifier.json` from that split and a model). It has never run, so metric 5 (reviewer load: tokens read and effort, today vs ours) has no numbers yet. That's our best answer to "plain AI review already stops 12 of 12".
- [ ] [JH] Developer-side eval (verification-first-developer-harness/evaluation/pocketbase/README.md). `number` done: both arms pass the hidden tests, harness $1.23 vs default $0.47, and the simulated engineer corrected one claim in the plan. The other 9 tasks are running on Jon's machine (about 4:15 PM). Then `node --no-warnings run.ts all --report` and mark "surfaced the open question" by hand.
- [ ] [JH] Metrics (AIE-5): pick the 2–3 numbers for the demo and the slide (overdue since 3:30). Settled now: the verifier stopped 10 of 12 bad PRs, CI stopped 0 (verifier/results/summary.md). Waiting on SB: reviewer load (metric 5). Be upfront that the verifier passed only 1 of 8 honest PRs (3 wrongly blocked, 4 sent to a person) and that AI review did better on 1–3. Definitions in verifier/docs/metrics.md (now including developer-side metrics 8 and 9).
- [ ] [MA] Lean for software verification: decide **now** (was due 1:30 PM) whether it goes in the demo or becomes a "what's next" slide.

### Open: pick one up

1. [ ] **Pick the demo scenario** (was DT, SB; overdue, blocks everything below). The repo, the change and what the audience sees. `h-bearer` already runs end to end by hand (harness plan → verifier → PASS). The strongest moment is the verifier blocking a bad change that CI passes: `r-number` was blocked in the benchmark. Showing that live needs a plan.md for it (see Next).
2. [ ] **Write the demo script** in docs/submission.md: 3 minutes, roughly problem → engineer approves claims → verifier verdict with evidence → the numbers. Due at the 4:00 PM freeze.
3. [ ] **Slides.** SB's 6-slide deck and diagrams are in presentation/. Add the numbers slide from JH and a "what's next" slide (Lean from MA, extended split, developer-side eval).
4. [ ] **One-minute demo video** as a backup in case the live demo fails. Due 4:30 PM.
5. [ ] **README pitch, team and links**, then **submit the form** (every member listed, repo public and readable by judges). Due 4:45 PM. Check the README and pitch say "developer harness" and "reviewer harness" consistently.
6. [ ] **Did anyone claim the $100 Meta credits?** The claim closed at 3:00 PM (form on the CV details page, see resources/sponsors.md). If billing got set up, the 402 `billing_not_configured` may be fixed: try one verifier call with `META_API_KEY`. Real Muse Spark calls are what the Meta prize is judged on.
7. [ ] **Run the extended split** (19 new cases, verifier/cases/README.md): from `verifier/`, `node --no-warnings src/benchmark.ts extended`. CI step done (19/19 pass, reverts included); the model steps need `META_API_KEY` or saved answers. Gives a false-alarm rate on 18 good cases instead of 8. Nice to have; a "what's next" line if it doesn't finish.
8. [ ] [SB] Verifier: test the PR page and GitHub status end to end (not tried yet). Only if the demo uses the PR page.

## Next

After the freeze, only if there's time. Otherwise these are "what's next" material.

- [ ] Run the hand-off on a bad case (an `r-*` revert) to show BLOCK end to end; needs a plan.md for that case
- [ ] Run the hand-off with the real model (needs Meta billing fixed), so the h-bearer checks aren't hand-written
- [ ] Reviewer harness evals: its own numbers next to the simulated reviewer load
- [ ] Make the Meta Model API use visible in the demo and the pitch
- [ ] Load the claims review page from a real `.verify/plan.md` instead of built-in examples; add `category` and evidence `strength` to the plan template
- [ ] Plan and report view: one tree that scales from bug fix to feature (verification-first-developer-harness/display-scaling.md). Needs the `group` field from the claims contract
- [ ] Optional, after Meta works: Gemini as a second, independent checker on verdicts
- [ ] Revisit SubQ: own $5k track and 100M free tokens at console.subq.ai. Decide whether to add it as a whole-PR checker (docs/decisions.md)
- [ ] Developer-side eval: 3 runs per arm and more ambiguous tasks before quoting rates
- [ ] [SB, JH] Agree on the boundary between evals and metrics (datasets and graders vs the numbers we show)
- [ ] Decide how evals, metrics and Lean show up in the product or the demo

## Blocked

- [ ] [DT] Meta Model API chat calls (see Open item 6; get keys for everyone once billing works): waiting on billing for the Meta team (dev.meta.ai/billing). The key lists models fine; `POST /v1/chat/completions` returns 402 `billing_not_configured`. Ask Meta on site for hackathon credits. Until then the verifier uses saved answers (`MODEL=files` or no key).

## Done

- [x] [SB] Evals and dataset: 20 PocketBase PRs (8 real fixes, 4 reverts, 8 authored bad PRs), see verifier/cases/README.md (2026-11-07)
- [x] [JH] Benchmark grown to 39 cases: 19 new in an `extended` split, CI step run on all (verifier/cases/README.md) (2026-11-07)
- [x] [JH] Developer-side eval built: 10 PocketBase tasks, simulated engineer, hidden graders all checked (verification-first-developer-harness/evaluation/pocketbase/) (2026-11-07)
- [x] [JH] Metrics 8 and 9 (developer side) added to verifier/docs/metrics.md; missing numbers recorded (2026-11-07)
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
