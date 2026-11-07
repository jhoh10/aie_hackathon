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

## 2. Test plan

Produced in phase C, approved in phase D (Gate 1). Saved to `.verify/plan.md`.

```markdown
# Test plan: <task>

Status: DRAFT | APPROVED by <name> on <date>

## Checks

| # | Type | Check | Proves | Runs with | New? | Blocks done? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Unit | ... | ... | Jest | New | Yes |
| 2 | E2E | ... | ... | Playwright | New | Yes |
| 3 | Regression | Existing suite | Nothing else broke | npm test | Existing | Yes |

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

| Row | File | SHA-256 |
| --- | --- | --- |
```

---

## 3. Architecture map

Produced and approved in phase D (Gate 2). Appended to `.verify/plan.md`.

```markdown
## Architecture

| Component | Change | Covered by rows |
| --- | --- | --- |
| Reset page (UI) | New | 5, 6, 7, 8 |
| POST /api/reset | New | 3, 4, 9 |
| Token service | New | 1, 2 |
| users table | New column `reset_token_hash` | 3, migration |

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
Result: ✅ 10/10 automated checks passed · ⏳ 1 manual check pending

| # | Check | Result | Attempts | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Token expires after 30 min | Pass | 1 | log |
| 6 | Reused link shows an error | Pass | 3 | log, screenshot |
| 7 | Reset page matches baseline | Pass | 1 | desktop.png, iphone.png |

## What went wrong on the way
- Row 6 failed twice: token wasn't cleared after use. Fixed in `token.ts`.

## Locked tests
All locked test files unchanged since approval: yes

## Pending manual checks
- M1: Email renders well in Gmail and Outlook

## Changed files
<short diff summary>
```
