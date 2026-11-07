# Templates

The four artifacts a session produces. The harness saves them under `.verify/` in the repo being worked on, and copies the plan and report into the PR description.

---

## 1. Task brief

Produced in phase A. Saved to `.verify/brief.md`.

```markdown
# Task: <one line>

**Goal:** <why this matters, one or two sentences>

**Inputs:** <who or what triggers it, with what data>
**Outputs:** <what the user sees, what is stored, what is sent>

**Edge cases:**
- <invalid input / missing data / no permission / dependency down>

**Must not change:**
- <existing behaviour, APIs, URLs, data>

**Out of scope:**
- <what we're deliberately not doing>

**Budgets (if any):** <time, performance, cost>
```

---

## 2. Plan: claims and checks

Produced in phase C, approved by the engineer in phase D (the only approval in a session). Saved to `.verify/plan.md`. The claims are also exported as JSON for the verifier ([claims contract](../verifier/docs/claims-contract.md)).

```markdown
# Plan: <task>

Status: DRAFT | APPROVED by <name> on <date>

## Claims

| # | Claim | Kind | Group | Blocks done? |
| --- | --- | --- | --- | --- |
| c1 | <one behaviour, inputs and outputs only> | behavior_change | <optional area> | Yes |
| c2 | ... | behavior_change | | Yes |
| c3 | Everything that worked before still works | no_behavior_change | | Yes |

## Checks

| Claim | Type | Check | Runs with | New? |
| --- | --- | --- | --- | --- |
| c1 | Unit | ... | Jest | New |
| c2 | E2E | ... | Playwright | New |
| c3 | Regression | Existing suite | npm test | Existing |

## Manual checks

| # | Check | Who | When |
| --- | --- | --- | --- |
| M1 | ... | ... | Before release |

## Considered and skipped

| Type | Reason |
| --- | --- |
| Load test | Low-traffic endpoint |

## Cost

- Suite runtime: about <N> minutes
- New dependencies: <list or none>

## Locked test files (filled in at the start of phase E)

| Claim | File | SHA-256 |
| --- | --- | --- |
```

---

## 3. Design notes

Written by the agent at the start of phase E and kept up to date while it builds. **Not approved by the engineer**: the code and architecture are the agent's call. They explain the design and show that every component is covered by a claim. Included in the verification report.

```markdown
## Design notes

**Approach:** <two or three sentences: what the agent built and why it chose this over the obvious alternatives>

| Component | Change | Covered by claims |
| --- | --- | --- |
| Reset page (UI) | New | c5, c6, c7, c8 |
| POST /api/reset | New | c3, c4, c9 |
| Token service | New | c1, c2 |
| users table | New column `reset_token_hash` | c3, migration |

Uncovered components: none

New dependencies: Playwright (dev)
Migrations: add `reset_token_hash`, `reset_expires_at` to `users`
```

---

## 4. Verification report

Produced at the end of phase E. Saved to `.verify/report.md` and pasted into the PR.

```markdown
# Verification report: <task>

Plan: .verify/plan.md (approved by <name> on <date>)
Result: ✅ 10/10 claims proven · ⏳ 1 manual check pending

| # | Claim | Result | Checks | Attempts | Evidence |
| --- | --- | --- | --- | --- | --- |
| c1 | A reset link older than 30 minutes is rejected | Pass | 1/1 | 1 | log |
| c6 | A reset link works only once | Pass | 1/1 | 3 | log, screenshot |
| c7 | The reset page looks right on desktop and mobile | Pass | 2/2 | 1 | desktop.png, iphone.png |

## Agent-added claims
| # | Claim | Why it was added | Result |
| --- | --- | --- | --- |
| A1 | Expired tokens are purged nightly | Cleanup job had no covering claim | Pass |

## Design notes
<the design notes from section 3>

## What went wrong on the way
- c6 failed twice: token wasn't cleared after use. Fixed in `token.ts`.

## Locked tests
All locked test files unchanged since approval: yes

## Pending manual checks
- M1: Email renders well in Gmail and Outlook

## Changed files
<short diff summary>
```
