# Decisions

One entry per real choice. Newest first. These are handy when writing the pitch ("we chose X because...").

<!-- Copy this block for each new decision:

## YYYY-MM-DD: <what we decided>

- **Chose:**
- **Over:**
- **Because:**
- **Revisit if:**

-->

## 2026-11-07: Live demo: the sim engineer knows the intent (`--brief`)

- **Chose:** an optional `--brief` for `sim/run.py`: the simulated engineer also knows what it wants (for pylint-8898, written from the upstream fix in behaviour terms: only `{}` protects a comma). It follows the PocketBase eval's rule: it answers only what an agent asks or what a plan gets wrong, never recites the brief, and the same engineer serves both sides. presentation/live-demo.md uses it.
- **Over:** an engineer who knows only the issue (the sim's default, still the default), or picking a different task.
- **Because:** without a brief, nobody in the loop can answer the question that decides the hidden test, so the harness's question gets a guess for an answer: Side C passed 1 of 5, Side A 0 of 5. A real engineer knows their intent; the PocketBase eval already models that. With the brief, Side C passed 2 of 2 (corrected at plan time, before code), and Side A also passed 2 of 2 (once on its own, once after a post-build correction and rework). The demo shows "caught at the plan" vs "caught after building", not a pass-vs-fail gap.
- **Revisit if:** we want a pass-vs-fail contrast: that needs a task where the default agent's report doesn't reveal its design, or the `idchars` PocketBase task.

## 2026-11-07: Demo: wrong guess vs one-line fix, then the review packet

- **Chose:** A, then D, with C as the fallback. A: on `idchars`, default Claude guesses its own list of forbidden id characters and fails the maintainer's hidden tests; our harness shows a plan, the engineer adds one line, and it passes. D: the reviewer packet on pylint-8898, where all 11 approved checks passed but the packet flagged the untested `( )` handling that failed the real hidden test. C: `h-bearer`, harness plan to verifier PASS, fully live.
- **Over:** B, the verifier blocking `r-number` while CI passes.
- **Because:** A is new, uses today's results and needs no Meta API (default fails 2 of 7 ambiguous issues, harness 0). D is a static page, so it can't fail on stage. B is real, but plain AI review also stops `r-number` and beats the verifier on false alarms, which invites the hardest Q&A question.
- **Revisit if:** the remaining eval tasks change the 2-vs-0 picture, or Meta billing starts working and a live model call becomes worth showing.

## 2026-11-07: Evaluate the developer harness on ambiguous PocketBase issues, with a simulated engineer

- **Chose:** 10 real PocketBase fixes as tasks (7 ambiguous, 3 clear controls). Each agent sees only the issue. A simulated engineer who knows the intent answers only what the agent asks or gets wrong, and the upstream fix's own test functions grade the result.
- **Over:** more SWE-bench Verified tasks, or grading on the whole test package.
- **Because:** SWE-bench Verified filtered out underspecified issues, which is exactly where the harness should help; in our two runs both agents passed. PocketBase reuses the verifier's Docker and Go setup. Grading only the changed test functions avoids unrelated, environment-dependent failures elsewhere in the package. An engineer who answers only questions keeps it fair: the default agent gets the same answers if it asks.
- **Revisit if:** the brief (taken from upstream's fix) rewards one particular design on more tasks than oauth, or runs vary too much to read anything from one run per arm.

## 2026-11-07: Grow the benchmark to 39 cases in a separate `extended` split

- **Chose:** 19 more PocketBase cases (10 real upstream fixes, 9 reverts), mostly built as fix/revert pairs from the same commit, in a new `extended` split. 18 good and 21 bad in total.
- **Over:** staying at 20, or adding them to holdout.
- **Because:** at 20 cases one case moves a rate by 5 to 12 points, and 8 good cases can't pin down the false-alarm rate (1 in 8 has a 95% interval of about 2–47%). Pairs give good and bad cases of the same difficulty, so a catch can't just be "flags hard diffs". A separate split leaves the dev/holdout split as it was fixed before any run, and leaves Sebastian's holdout run untouched.
- **Revisit if:** the extended run doesn't finish by the 3:30 PM numbers checkpoint. Then report dev and holdout only and mention extended as in progress.

## 2026-11-07: Reviewer harness scope: review the change, not the code

- **Chose:** a review packet generated from the diff after the build: what the PR does (before → after), its tests as inputs → outputs, and its architecture changes, kept to about 300 words (at most 3 one-line behaviour rows plus one row for every behaviour no test covers, marked **No test**). The reviewer approves or critiques packet items, and blocking comments go back to the developer harness as claim edits (verification-first-reviewer-harness/).
- **Over:** reviewing the raw diff, or relying only on what already serves the reviewer: the claims review page (before the build: are these the right claims?) and the verifier verdict (are the approved claims proven?). Neither looks for behaviour beyond the claims.
- **Because:** on pylint-8898 a run passed all 11 approved checks but also changed `( )` comma handling, which no check covered. That is what failed the real hidden test. The packet marked it **No test**, in about 30 seconds for about $0.20.
- **Revisit if:** packets miss real problems that a raw-diff review would catch, or reviewers still open the diff for most items.

## 2026-11-07: Demo in Claude Code; the verifier stays model-agnostic

- **Chose:** keep building and demoing the developer harness in Claude Code. The verifier stays model-agnostic (any OpenAI-compatible model, set by env vars). For the demo it runs on Muse Spark through the Meta Model API.
- **Over:** moving the harness and demo to Muse Code, Meta's coding agent, or pitching the verifier as Meta-only.
- **Because:** the prize is "Best Use of Meta Model API", which is about the API in the product, and no prize rule mentions Muse Code (resources/event.md). Switching agents three hours before the deadline risks the demo. Tying the product to one model would be done for the prize, not for users. The real design point is that the verifier should run on a different model from the implementer, so the two don't share blind spots, and Muse Spark is the one we use today.
- **Revisit if:** Meta's judges say on site that using Muse Code counts toward the prize.

## 2026-11-07: The harness runs lean by default

- **Chose:** the lean prompt (verification-first-developer-harness/harness-prompt.md). Phases A and B produce no messages, there are at most 8 claims, a fixed set of regression tests is checked once before and once after building, and the final message is at most 4 lines. It keeps the single approval of the claims and the team's plan format, so the verifier hand-off is unchanged.
- **Over:** the full five-phase conversation, where every phase talks to the engineer and the full suite runs during the build loop.
- **Because:** over 3 runs each on a SWE-bench task, cost fell from $0.88 to $0.42 and time from 2.5 to 1.3 minutes. The engineer read half as many words (542 to 280) and always gave exactly one reply. The old prompt cost more than the default agent ($0.74), and lean is cheaper.
- **Revisit if:** lean plans start missing claims that the full conversation would have caught. Check this on tasks where the pass rate actually separates the two.

## 2026-11-07: The verifier reads the claims from the approved plan.md

- **Chose:** a small converter (`verifier/src/handoff.ts`) that parses the Claims table of `.verify/plan.md`, refuses plans that aren't `Status: APPROVED`, and writes `.verify/claims.json` per the claims contract before running the verifier.
- **Over:** having the harness template emit the JSON as a second copy of the claims.
- **Because:** the plan's Claims table already has the contract's columns (#, Claim, Kind, Group). One source means the claims the engineer approved are exactly the ones the verifier checks, with no second copy to drift, and the harness conversation doesn't change.
- **Revisit if:** claims need fields a markdown table can't hold well, or the plan view (display-scaling.md) starts writing JSON itself.

## 2026-11-07: Muse Spark 1.3, standard model, via the existing OpenAI-compatible client

- **Chose:** `muse-spark-1.3` (newest listed by `GET /v1/models`) through the verifier's existing `openaiModel`, configured by env vars (`META_API_KEY`, `MODEL_BASE_URL`, `MODEL_NAME`).
- **Over:** the `-contributor` variants (they allow Meta to train on inputs, and we send code), LiteLLM or the OpenAI SDK (a new dependency for what is one fetch call).
- **Because:** no new dependency, and switching models or endpoints (Gemini, Claude via a compatible proxy) stays an env change.
- **Revisit if:** 1.3 is slow or gives bad JSON once billing works; try `MODEL_NAME=muse-spark-1.2`.

## 2026-11-07: Chase the Meta prize; skip Fetch.ai and MongoDB for now

- **Chose:** go all in on the Meta Model API ($5k, the only confirmed prize). The verifier's model step is already OpenAI-compatible (verifier/src/model.ts), so Muse Spark is mostly a base URL, key and model name change. If it's cheap once Meta works, add Gemini as a second, independent checker ("two labs agree the claim is proven"). Ask SubQ on site for a key, since whole-codebase context suits verifying a PR.
- **Over:** Fetch.ai (uAgents and Agentverse are for agents that find and message each other; wrapping the verifier as an agent is thin and adds setup without improving the demo) and MongoDB Atlas (a store of past verdicts with vector search is a side feature that would look bolted on).
- **Because:** limited time. The Meta integration costs little and is the only prize we know exists. The other $6k split is behind the Cerebral Valley login and unknown.
- **Revisit if:** the details page shows a sizeable Fetch.ai, MongoDB or DeepMind track.

## 2026-11-07: Measure cognitive load with agents standing in for the engineer

- **Chose:** agents do the two human steps (approving claims, then the merge decision from the verifier's summary) and today's step (merge decision from the diff). We measure tokens read, evidence opened, right decisions and self-rated effort on the Paas scale at each step (verifier/src/simulate.ts).
- **Over:** human data (timed sessions, a one-question effort rating on the PR page) and word counts with assumed reading speeds.
- **Because:** there's no time to collect human data today, and agent runs give a measured comparison on every benchmark case, scored against known answers.
- **Revisit if:** we get even a few real reviewers. Their numbers would check whether the agents' load tracks a person's.

## 2026-11-07: The engineer approves claims, not tests

- **Chose:** the one human gate approves **claims**: plain-language behaviours that must be true. Tests, screenshots, evals and the rest are the checks under each claim, shown as evidence. Pitch is now "The engineer approves the claims, not the code." Harness docs, templates and the README updated to match. Agreed with DT.
- **Over:** approving a table of tests directly.
- **Because:** claims mean the same thing at any task size, so a feature doesn't turn into 40 unit tests to approve. They are also exactly what the verifier already takes (verifier/docs/claims-contract.md), so the harness and the verifier now share one hand-off.
- **Revisit if:** engineers can't judge a claim without opening its checks every time.

## 2026-11-07: The harness display scales by grouping claims, not by mode

- **Chose:** one tree for every task (feature → optional area → claim → evidence). The engineer approves claims; tests sit under them as evidence. How far the tree opens by default depends on the number of claims, and failures always open down to the failing test. Details in verification-first-developer-harness/display-scaling.md.
- **Over:** a separate "bug fix" and "feature" view, or a scale setting the user picks; and showing every unit test as a plan row.
- **Because:** claims are the same kind of thing at any scale, so the gate stays the same. A feature plan stays readable, and a bug fix still shows its tests.
- **Revisit if:** real plans don't group cleanly into areas, or engineers keep opening the evidence to approve a plan.

## 2026-11-07: Push straight to main, no PRs

- **Chose:** everyone commits and pushes directly to `main`; changes that go against the rest of the repo get flagged before pushing.
- **Over:** feature branches with PR review.
- **Because:** speed matters more than process at a hackathon, and the flag-first rule keeps the team aligned on anything surprising.
- **Revisit if:** we keep clobbering each other's work on main.

## 2026-11-07: Build idea 1, the verification-first harness

- **Chose:** Idea 1: talk through the tests before writing the code. The agent and the engineer agree on inputs, outputs and the test plan first, then the agent builds until the approved tests pass (verification-first-developer-harness/).
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
