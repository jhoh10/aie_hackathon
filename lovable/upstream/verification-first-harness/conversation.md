# The conversation, phase by phase

Every session goes through five phases in order. The agent may loop back (for example from D to C when the engineer edits the plan), but never skips forward. Code is only written in phase E.

The engineer approves **one thing: the claims** (what must be true) and the checks that will prove them. The code and the architecture are the agent's call; it doesn't ask for approval on them.

Running example used below: **"Add a password-reset flow"** to an existing web app.

---

## Phase A: Discuss the idea

**Goal:** both sides understand *what* is being built and *why*, in terms of inputs and outputs, before anyone looks at code.

**The engineer:** describes the task in their own words.

**The agent:**
- Restates the task in one or two sentences and asks whether that's right.
- Pins down the **inputs** (who or what triggers this, with what data), the **outputs** (what changes, what the user sees, what gets stored or sent) and the **out of scope** list.
- Asks about the edges early: invalid input, permissions, empty states, failure of a dependency.
- Does **not** propose a solution or architecture yet.

**Questions the agent asks (pick what fits):**
- Who uses this, and what are they trying to do?
- What goes in, and what should come out?
- What should happen when it goes wrong?
- What must not change? (Existing behaviour, APIs, URLs, data.)
- Is there a deadline or performance budget?
- How will you know, as a user, that this works?

**Exit criteria:** the engineer agrees with the **task brief** (template in [test-plan-template.md](test-plan-template.md#1-task-brief)).

> **Engineer:** Users keep getting locked out. Add a password reset.
>
> **Agent:** So: a signed-out user enters their email, gets a link, sets a new password and can sign in with it. The old password stops working. Is that right? And two edge questions: should we reveal whether an email has an account, and how long should a link stay valid?
>
> **Engineer:** Right. Don't reveal it. 30 minutes.

---

## Phase B: Look into the code, then ask about testing

**Goal:** ground the plan in the real codebase, so the agent proposes tests that fit what's already there.

**The agent reads and reports back:**
- **Stack:** languages, frameworks, how the app runs locally.
- **Existing tests:** which kinds exist (unit, integration, e2e, visual), which runners (Jest, pytest, Playwright, ...), how they're run, and roughly how much coverage there is around the area being changed.
- **CI:** what runs on a PR and what blocks merge.
- **The area being touched:** relevant modules, routes, data models, external services (email, payments, LLMs).
- **Risk signals:** code with no tests, flaky tests, auth or money paths, UI-heavy changes, public APIs.

**Then it asks about testing, before proposing anything:**
- "You have Jest unit tests and no e2e tests. Are you open to adding Playwright, or should we stay within Jest?"
- "This changes the sign-in page. Do you want visual checks (screenshots) on it?"
- "Emails go through SendGrid. Should tests use a fake, or a sandbox account?"
- "Is there a test database, or do tests use mocks?"
- "Anything you've been burned by here before?"

**Exit criteria:** the agent has a short **codebase findings** note and the engineer has answered the testing questions.

> **Agent:** Findings: Next.js app, Postgres via Prisma. 40 Jest unit tests, none around auth. No e2e tests. CI runs `npm test` only. Email goes through a `mailer.ts` wrapper, which is easy to fake.
>
> Three questions before I propose a plan: (1) Can I add Playwright for e2e and screenshots? (2) Is it OK to spin up a test Postgres in Docker? (3) Anything about auth that's broken before?

---

## Phase C: Expand into the testing approach

**Goal:** turn the brief and findings into a complete set of plain-language **claims**, each with the **checks** that will prove it. This is the heart of the harness.

**The agent:**
- Walks through the [testing catalog](testing-catalog.md) and considers **every category**, not just unit tests. For each one it decides: include, skip (with a one-line reason), or ask.
- Writes each behaviour as one **claim**: an input and an output, specific enough that a test could disprove it, with no implementation detail.
- Lists the **checks** under each claim: *type, what's tested, how it runs*. A claim can have several checks. No test code in this phase.
- Covers the happy path, each edge case from phase A, and each "must not change" item (as `no_behavior_change` claims).
- Marks which checks are **new** and which **already exist** and must keep passing.
- Estimates cost: how long the suite will take and any new dependencies.
- Flags anything it **can't** verify automatically (for example "the email looks good in Outlook") so a human can check it by hand.

**What the engineer sees** (full template in [test-plan-template.md](test-plan-template.md#2-test-plan)):

| # | Claim | Checks | Runs with |
| --- | --- | --- | --- |
| c1 | A reset link older than 30 minutes is rejected | Unit: token expires after 30 min | Jest |
| c2 | A weak new password is refused | Unit: password policy | Jest |
| c3 | Asking for a reset sends exactly one email | Integration: email queued once | Jest + test DB |
| c4 | The response doesn't reveal whether an account exists | Integration: unknown and known email get the same response | Jest + test DB |
| c5 | A user can reset their password and sign in | E2E: request → email → new password → sign in | Playwright |
| c6 | A reset link works only once | E2E: reused link shows an error | Playwright |
| c7 | The reset page looks right on desktop and mobile | Visual: matches baseline at both sizes | Playwright screenshots |
| c8 | The reset form works with a screen reader | Accessibility: no axe violations | axe-core |
| c9 | One IP can request at most 10 resets a minute | Security: 11th request is refused | Jest + test DB |
| c10 | Everything that worked before still works (`no_behavior_change`) | Regression: existing 40 unit tests | Jest |
| — | The email looks right in Gmail and Outlook | Manual | Human, before release |

For a big task the claims get grouped into areas and the checks fold under each claim; see [display-scaling.md](display-scaling.md).

Skipped, with reasons: *load test (low traffic endpoint), mutation testing (time), cross-browser beyond Chromium (ask if needed).*

**Exit criteria:** a draft plan the agent believes is complete.

---

## Phase D: Confirm the testing approach with the engineer

**Goal:** the engineer approves exactly what "done" means and how it will be verified. This is **the only gate** in the session.

**The agent:**
- Shows the claims with their checks, the skipped list and the manual checks.
- Asks one direct question: *Approve, or edit?*
- Applies edits (add, remove or change a claim or a check) and shows the plan again. Loops until approved.
- Saves the approved plan to `.verify/plan.md` with who approved it and when.

**The engineer can:**
- Approve as is.
- Edit claims or checks ("add an iPhone screenshot to c7", "drop c9, the gateway does that").
- Promote a skipped check back in.
- Mark a claim as "nice to have" (runs, but doesn't block done).
- Add a claim for anything they care about in *how* it's built, such as "no new dependencies", "p95 under 200 ms" or "uses the existing `mailer.ts`". This is the only way the engineer steers the design: as a verifiable check, not a design review.

**What the agent does not do here:** show or ask about the architecture. It doesn't need the engineer's sign-off on components, libraries or file layout.

**Exit criteria:** the engineer approves the claims. No code exists yet.

> **Agent:** Here's the plan: 10 claims with automated checks and 1 manual one. Approve, or edit?
>
> **Engineer:** Add the visual check on an iPhone viewport too. Otherwise approve.
>
> **Agent:** Updated c7's check to desktop + iPhone 15. Saved to `.verify/plan.md` as approved. Starting the build.

---

## Phase E: Implement the code and the tests, and make them pass

**Goal:** the agent builds until every approved claim is proven, then shows the evidence.

**Order of work:**
1. **Choose the design.** The agent picks the code and architecture it thinks are best, following the codebase's existing patterns from phase B. No approval needed. It writes short **design notes** (components, the main choices and why, and which claims cover each component) that go into the verification report.
2. **Check coverage of its own design.** If a component it plans to build isn't covered by any approved claim, the agent adds a claim for it, marked **agent-added**. The agent may add claims and checks freely, but never remove or weaken an approved one.
3. **Write the tests first**, from the approved plan, one test (or test group) per check. Run them and confirm they **fail** for the right reason (the feature doesn't exist yet). A test that passes before the feature exists is testing nothing.
4. **Lock the approved tests.** The agent records a hash of each test file in `.verify/plan.md`. From here on it may not weaken an assertion, skip a test or drop a claim without asking.
5. **Implement** the feature.
6. **Run the full suite**, including the existing regression tests.
7. **Loop:** read failures, fix the *code*, re-run. Repeat until green. The agent may change its own design along the way if that's what it takes; it just updates the design notes.
8. **Escalate instead of cheating.** If the agent believes a test itself is wrong, or a check can't be done, it stops and asks, showing the evidence. It never edits a locked test to make it pass.
9. **Report.**

**Guardrails during the loop:**
- Max iterations (for example 10) before asking the engineer for help.
- Flaky test detection: re-run a failing test 3 times; if results differ, report it as flaky instead of "fixing" it.
- Visual tests: first run creates baselines; the engineer approves the baseline screenshots once.

**The verification report** (template in [test-plan-template.md](test-plan-template.md#4-verification-report)) lists every claim with pass/fail and the checks under it, how many attempts it took, links to screenshots and logs, any agent-added claims, the manual checks still pending, the design notes and the diff summary. The design notes are there to explain, not for approval. This report goes in the PR description, so the **reviewer checks the claims and the evidence, not every line of code.**

> **Agent:** Done. 10/10 approved claims proven, plus 1 I added for the token cleanup job (c6 failed twice: the token wasn't being cleared after use; fixed in `token.ts`). Design: a stateless token service with hashed tokens in the `users` table; notes in the report. Visual baselines for desktop and iPhone are attached for your approval. One manual check is pending: email rendering in Outlook. Report saved to `.verify/report.md`.

---

## When the conversation loops back

| From | To | Why |
| --- | --- | --- |
| B | A | The code shows the task is bigger or different than described |
| D | C | The engineer edits or adds checks |
| E | D | A test turns out to be wrong or impossible; the engineer must re-approve the change |
| E | A | Implementation reveals the requirement itself was unclear |
