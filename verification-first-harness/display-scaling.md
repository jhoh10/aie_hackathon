# Showing a plan at any scale

A task can be one bug fix or a whole feature. The harness should show both on the same screen without dumping 40 unit tests on someone who is approving a feature, and without hiding the one test that matters in a bug fix.

## The idea in one line

The engineer approves **claims**. Tests are the **evidence** under each claim. The screen is always the same tree, and the size of the tree decides how far it's opened by default.

## The tree

```
Feature: "Team invites"                       ← only appears for big tasks
 ├─ Area: Sending invites          4/4 ✓
 │   ├─ c1  Owner can invite by email   ✓
 │   │    └─ evidence: unit ×3, e2e ×1    ← collapsed by default
 │   └─ ...
 └─ Area: Accepting invites        2/3 ✗      ← failing areas open automatically
```

| Level | What it is | Who decides it |
| --- | --- | --- |
| Feature | The task brief from phase A | Engineer |
| Area | A group of related claims (optional) | Agent proposes, engineer can regroup |
| Claim | One behaviour that must be true, as in the [claims contract](../verifier/docs/claims-contract.md) | **Engineer approves** |
| Evidence | Unit tests, e2e runs, screenshots, evals: anything from the [testing catalog](testing-catalog.md) | Agent writes, verifier runs |

Claims don't depend on scale: "a lowercase `bearer` prefix authenticates" and "an invited user lands on the team page" are both just behaviours. That's why they are the right thing to approve at any size.

## How far it opens by default

| Claims in the plan | Default view |
| --- | --- |
| 1–3 (bug fix) | Flat list of claims, evidence expanded. The user sees the actual tests. |
| 4–10 (small change) | Flat list of claims, evidence collapsed to a count ("3 checks ✓"). |
| More than 10 (feature) | Claims grouped into areas, each area collapsed with a pass count. |

The thresholds are a starting guess. Tune them once we have real plans.

**One rule at every scale:** anything failing opens automatically all the way down to the failing evidence. Detail shows up where it needs attention and stays out of the way everywhere else.

## Do we show the "scale" itself?

Not as a mode the user picks. The layout comes from the number of claims. A small header label is enough, for example:

- `Bug fix · 2 claims`
- `Feature · 14 claims in 4 areas`

The agent can suggest the label in phase A, but nothing depends on it.

## What it changes

- **Claims contract:** add an optional `group` field to each claim. The verifier ignores it; only the display uses it. Nothing changes in the verifier hand-off.
- **The gate (phase D):** for a feature, the engineer approves areas and claims, never individual unit tests. For a bug fix the claims are few enough that the tests are visible too.
- **Verification report:** use the same tree, so the report rolls up the same way as the plan.

## Demo idea

Show the zoom: first a one-claim bug fix with its test visible, then a feature-sized plan where the same screen rolls up into areas. Break one test in the feature and the tree opens straight to it.
