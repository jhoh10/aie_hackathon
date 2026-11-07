# Submission

**Deadline:** Saturday 2026-11-07, 5:00 PM PT. First-round judging runs 5:00–6:45 PM. Finals are 7:00–8:00 PM, winners at 8:15 PM.

**Submit:** public repo, a one-minute demo video, and all team members on the submission page.

## Judging criteria

Live demo of about 3 minutes, then 1-2 minutes of Q&A. The top six teams demo on stage, where all four criteria count equally.

- Technical demo: 35%. Does it work and impress?
- Implementation difficulty: 30%. Is it more than a few AI prompts away?
- Impact potential: 20%. Is it a significant real-world pain?
- Creativity: 15%. Is it something new?

Disqualifiers: the demo must clearly show what was built today, and no existing projects. Any project where a dashboard is the main feature is on the banned list.

## Checklist

- [ ] Repo is accessible to judges (public, or judges added)
- [ ] README has the pitch, team and how to run it
- [ ] App is deployed or runs from a clean clone
- [ ] Demo video recorded (check the length limit)
- [ ] Slides done
- [ ] Every team member listed on the submission form
- [ ] Submitted, with time to spare

## Demo script

3 minutes. Scenario picked at 3:58 PM (docs/decisions.md): A, the developer harness on `idchars`; then D, the review packet on pylint-8898; C, `h-bearer` plan to PASS, is the fallback. Lines to say are in quotes; stage directions are in brackets.

**Before going on stage**
- Tab 1: terminal in `verification-first-developer-harness/evaluation/pocketbase/`, with the `idchars` default diff and the hidden-test FAIL ready to show (`.work/idchars/default.diff`, `results/idchars-default.json`).
- Tab 2: a Claude Code session with the harness prompt, in a fresh PocketBase checkout at the commit before the `idchars` fix, the issue text ready to paste (`tasks.json`).
- Tab 3: `verification-first-reviewer-harness/examples/pylint-8898/review.html` in a browser.
- Tab 4 (fallback C): terminal in `verifier/`, Docker images already built: `node --no-warnings src/handoff.ts ../verification-first-developer-harness/examples/h-bearer/.verify/plan.md --case h-bearer`.
- Backup video queued in case the live part fails.

### 1. Problem (0:00–0:15)

"Coding agents write code faster than anyone can check it. The engineer either reads every line or trusts the agent. And the agent never asks what you meant: it guesses, and its guess looks just as confident when it's wrong."

### 2. Developer side: a wrong guess vs a one-line fix (0:15–1:15)

"Here's a real PocketBase issue: record ids can contain characters that break file paths. Which characters? The issue doesn't say."

[Tab 1] "Default Claude Code made a sensible choice: its own list. It looks right and it compiles. But it isn't what the maintainer wanted, and the project's real tests fail."

[Tab 2, paste the issue] "Same model, with our harness. Before writing any code it shows a plan: the claims that must be true, and how each will be proven." [Wait for the plan, about 40 s; talk over it.] "The engineer approves claims, not code. Here's the gap, so I add one line:" [type] "Reject `.` and space anywhere in the id." [Approve.]

"From here it builds until every claim is proven. This run already finished:" [show `results/idchars-harness.json`, hidden tests PASS] "it passes the maintainer's tests."

"Across 7 real issues that leave a decision open, default Claude got 2 wrong. Our harness got all 7 right, for about 2.6 times the cost: a dollar or two per issue."

### 3. Reviewer side: what nobody proved (1:15–2:00)

[Tab 3] "Then someone has to review it. This is a real pylint change built with our harness: all 11 approved checks pass. A reviewer would merge it."

"Our review packet reads the diff and lists, in about 300 words, what the change does and which behaviour has a test. This line is marked **No test**: commas inside parentheses. That's exactly what failed the project's real hidden test. The reviewer sees it in 30 seconds, without reading the diff. It took 48 seconds and 18 cents."

### 4. Numbers, honesty and what's next (2:00–2:45)

"We also built a verifier that runs each approved claim on the old and the new code. On 20 PocketBase PRs it stopped 10 of 12 bad ones. The project's own CI stopped none."

"What didn't work yet: it blocks too many good PRs, passing 1 of 8. Plain AI review did better on this set. And in our simulated reviewer, the verdict summary alone led to worse decisions than reading the diff. So our bet is on the start of the work: agree on what 'done' means before any code, and show the reviewer what wasn't proven."

"Next: formal proofs in Lean for critical logic, a bigger benchmark (39 cases ready), and running the verifier on Meta's Muse Spark."

### 5. Close (2:45–3:00)

"The engineer approves the claims, not the code, and the agent isn't done until they're proven. Thank you."

**If the live part fails:** skip straight to the recorded result in tab 1, or run fallback C in tab 4 (about 75 s, ends in PASS).

### Q&A prep

- **"AI review caught all 12 bad PRs, so why not just use that?"** It's an opinion from the same kind of model that wrote the code. Our checks are executed on the old and new code, and the claims are agreed with the engineer before anything is written. On this set AI review was very strong; we say so in the README.
- **"Doesn't the harness just cost more?"** About 2.6× on these tasks. On clear issues it buys nothing; on the 7 ambiguous ones it turned 2 wrong changes into right ones. One wrong change shipped costs far more than a dollar.
- **"Isn't the engineer simulated?"** Yes, a Claude agent that knows the intent and only answers what it's asked. If the default agent never asks, it never gets answers. One run per arm, so these are examples, not rates.
- **"Is 'right' just whatever the maintainer chose?"** Yes. The default's answer was defensible, just not what was asked for. That's the problem we're solving.
- **"Where's Meta?"** The verifier is wired to Muse Spark; billing wasn't active, so today's model answers came from Claude.
