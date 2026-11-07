# The conversation, phase by phase

Every session goes through five phases in order. The agent may loop back (for example from D to C when the engineer edits the plan), but never skips forward. Code is only written in phase E.

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

**Goal:** turn the brief and findings into a complete, plain-language **test plan**. This is the heart of the harness.

**The agent:**
- Walks through the [testing catalog](testing-catalog.md) and considers **every category**, not just unit tests. For each one it decides: include, skip (with a one-line reason), or ask.
- Writes each check as one row: *type, what's tested, what it proves, how it runs*. No test code in this phase.
- Covers the happy path, each edge case from phase A, and each "must not change" item (as regression checks).
- Marks which checks are **new** and which **already exist** and must keep passing.
- Estimates cost: how long the suite will take and any new dependencies.
- Flags anything it **can't** verify automatically (for example "the email looks good in Outlook") so a human can check it by hand.

**What the engineer sees** (full template in [test-plan-template.md](test-plan-template.md#2-test-plan)):

| # | Type | Check | Proves | Runs with |
| --- | --- | --- | --- | --- |
| 1 | Unit | Token expires after 30 min | Old links are rejected | Jest |
| 2 | Unit | Weak password is refused | Password policy holds | Jest |
| 3 | Integration | Reset email is queued exactly once | No duplicate emails | Jest + test DB |
| 4 | Integration | Unknown email returns the same response as a known one | Accounts aren't revealed | Jest + test DB |
| 5 | E2E | Request → email → new password → sign in | Whole flow works in a browser | Playwright |
| 6 | E2E | Reused link shows an error | Links are single-use | Playwright |
| 7 | Visual | Reset page matches baseline, desktop + mobile | No layout regressions | Playwright screenshots |
| 8 | Accessibility | Reset form has no axe violations | Usable with a screen reader | axe-core |
| 9 | Security | 10 requests/min per IP limit on reset | Can't be used to spam | Jest + test DB |
| 10 | Regression | Existing 40 unit tests still pass | Nothing else broke | Jest |
| — | Manual | Email renders well in Gmail and Outlook | Looks right to real users | Human, before release |

Skipped, with reasons: *load test (low traffic endpoint), mutation testing (time), cross-browser beyond Chromium (ask if needed).*

**Exit criteria:** a draft plan the agent believes is complete.

---

## Phase D: Confirm the testing approach with the engineer

**Goal:** the engineer approves exactly what "done" means. This is **Gate 1**. Then the agent shows the architecture: **Gate 2**.

### Gate 1: the test plan

**The agent:**
- Shows the table, the skipped list and the manual checks.
- Asks one direct question: *Approve, or edit?*
- Applies edits (add, remove, change a row) and shows the plan again. Loops until approved.
- Saves the approved plan to `.verify/plan.md` with who approved it and when.

**The engineer can:**
- Approve as is.
- Edit rows ("add an iPhone screenshot", "drop the rate-limit test, the gateway does that").
- Promote a skipped check back in.
- Mark a row as "nice to have" (runs, but doesn't block done).

### Gate 2: the architecture

Once the plan is approved, the agent shows **how** it will build it, at the component level:
- The components it will add or change (UI, API route, service, data model, external calls).
- For each component, **which plan rows cover it**. Any component with no covering test is flagged.
- New dependencies and migrations.

```
Reset page (UI)        ← rows 5, 6, 7, 8
   │
POST /api/reset        ← rows 3, 4, 9
   │
Token service          ← rows 1, 2
   │
Mailer (fake in tests) ← row 3
```

**Exit criteria:** the engineer approves the architecture. No code exists yet.

> **Agent:** Here's the plan: 10 automated checks and 1 manual one. Approve, or edit?
>
> **Engineer:** Add the visual check on an iPhone viewport too. Otherwise approve.
>
> **Agent:** Updated row 7 to desktop + iPhone 15. Saved to `.verify/plan.md`. Here's the architecture; every component is covered by at least one row. Approve?
>
> **Engineer:** Approve.

---

## Phase E: Implement the code and the tests, and make them pass

**Goal:** the agent builds until every approved check passes, then proves it.

**Order of work:**
1. **Write the tests first**, from the approved plan, one test (or test group) per row. Run them and confirm they **fail** for the right reason (the feature doesn't exist yet). A test that passes before the feature exists is testing nothing.
2. **Lock the approved tests.** The agent records a hash of each test file in `.verify/plan.md`. From here on it may not weaken an assertion, skip a test or delete a row without asking.
3. **Implement** the feature.
4. **Run the full suite**, including the existing regression tests.
5. **Loop:** read failures, fix the *code*, re-run. Repeat until green.
6. **Escalate instead of cheating.** If the agent believes a test itself is wrong, or a check can't be done, it stops and asks, showing the evidence. It never edits a locked test to make it pass.
7. **Report.**

**Guardrails during the loop:**
- Max iterations (for example 10) before asking the engineer for help.
- Flaky test detection: re-run a failing test 3 times; if results differ, report it as flaky instead of "fixing" it.
- Visual tests: first run creates baselines; the engineer approves the baseline screenshots once.

**The verification report** (template in [test-plan-template.md](test-plan-template.md#4-verification-report)) lists every row with pass/fail, how many attempts it took, links to screenshots and logs, the manual checks still pending, and the diff summary. This report goes in the PR description, so the **reviewer checks the plan and the evidence, not every line of code.**

> **Agent:** Done. 10/10 automated checks pass (row 6 failed twice: the token wasn't being cleared after use; fixed in `token.ts`). Visual baselines for desktop and iPhone are attached for your approval. One manual check is pending: email rendering in Outlook. Report saved to `.verify/report.md`.

---

## When the conversation loops back

| From | To | Why |
| --- | --- | --- |
| B | A | The code shows the task is bigger or different than described |
| D | C | The engineer edits or adds checks |
| D (Gate 2) | C | A component has no covering test, so a check is added |
| E | D | A test turns out to be wrong or impossible; the engineer must re-approve the change |
| E | A | Implementation reveals the requirement itself was unclear |
