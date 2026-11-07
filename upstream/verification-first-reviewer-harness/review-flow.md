# The review, step by step

An agent prepares the packet (steps 1–3). A person reviews it (step 4). Their critique goes back to the developer agent (step 5).

The packet must be **short** (a reviewer reads it in a few minutes) and **honest** (every behaviour change shows up, and untested ones are never hidden inside covered ones).

---

## 1. Gather

The agent reads, and nothing else:
- **The diff** of the branch against its base, including new files.
- **The developer harness artifacts**, if any: `.verify/plan.md` (approved claims and checks) and `.verify/report.md`.
- **The verifier verdict**, if there is one.
- **The PR title and description**, treated as the author's *intent*, never as a description of the code.

A PR with no `.verify/` folder still gets a packet; its header says "No approved claims".

## 2. Write the packet from the diff

**Header.** One sentence of at most 15 words, then the counts: claims proven, tests new / changed, untested behaviours.

**What the PR does (F1…).** At most 3 rows for tested behaviour (related cases grouped) plus **one row for every behaviour no test covers**, marked **No test**. Each row at most 10 words, *before → after*, with the T rows whose inputs trigger it. A test of `{}` doesn't cover `()`.

**Tests (T1…).** At most 6 rows, similar cases grouped, input → expected output. A changed existing test says `(changed; was <old>)` in its output.

**Architecture (A1…).** At most 3 rows of 10 words, with the file.

## 3. Check

Before showing anything, the agent checks its own packet:
1. Every behaviour change in the diff has an F row. An untested one gets its own **No test** row.
2. Every covered F row names a T row whose input actually triggers it; otherwise it becomes **No test**.
3. Every section is within its word and row limits, and the header counts match.

## 4. The reviewer decides

The reviewer reads the packet (on the page from [ui/render.py](ui/render.py)) and records **Approve**, **Request changes** or **Comment** in `.verify/review.md`. Comments point at packet items, not lines of code:
- "F4: we don't want commas inside `( )` to stop splitting."
- "T2: add the case with an escaped comma."
- "A1: the helper belongs in `utils`."

Raw code is opened only for an architecture row the reviewer doubts.

## 5. Feedback goes back as claims

Each blocking comment becomes an edit to the developer harness plan:
- an unwanted F row → a new `no_behavior_change` claim
- a missing test → a new check under the claim
- an architecture objection → a claim about structure

The developer agent rebuilds against the edited plan, and the reviewer gets a new packet.
