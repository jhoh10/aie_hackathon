# Review packet template

The prompt ([review-prompt.md](review-prompt.md)) writes this to `.verify/review-packet.md`. The reviewer's decision goes in `.verify/review.md`, in the format at the bottom.

```markdown
# Review: <PR title or branch>

**<at most 15 words: what this PR does>**

Claims proven <n>/<m> (<verifier | author's report>) · Tests <new> new, <changed> changed · Untested behaviours <k>

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | <before → after, at most 10 words> | T1, T2 |
| F2 | <before → after, at most 10 words> | **No test** |

## Tests

<only if the PR adds, changes or removes tests>

| # | Input | Expected output |
| --- | --- | --- |
| T1 | <input> · <input> | <output> |
| T2 | <input> | <output> (changed; was <old>) |

## Architecture

<only for high-level changes: components, public APIs, config, dependencies, data or schema>

| # | Change | Where |
| --- | --- | --- |
| A1 | <at most 10 words> | `file` |
```

Sections: the header and "What the PR does" are always there. **Tests** appears only when the PR adds, changes or removes tests. **Architecture** appears only for high-level changes (a component added or removed, a public API, CLI, config, dependency, schema or data format change, a new connection between components); private helpers and internal refactors never count. A section with nothing to say is left out, not filled with "no change".

Limits: summary 15 words. What the PR does: at most 3 covered rows plus one row per untested behaviour, 10 words each. Tests: at most 6 rows, similar cases grouped. Architecture: at most 3 rows of 10 words.

## Reviewer decision (`.verify/review.md`)

```markdown
# Review decision: <PR>

Decision: APPROVE | REQUEST_CHANGES | COMMENT
Reviewer: <name> · <date>
Packet: .verify/review-packet.md (<commit sha it was generated from>)

## Comments

| On | Comment | Blocking? | Becomes |
| --- | --- | --- | --- |
| F2 | <critique> | Yes | new `no_behavior_change` claim: <text> |
| T1 | <critique> | No | new check under c1 |
```

The **Becomes** column is how critique flows back to the developer harness: every blocking comment turns into a claim or check edit in `.verify/plan.md` (see [review-flow.md](review-flow.md#5-feedback-goes-back-as-claims)).
