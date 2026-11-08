# Claims contract

This is the hand-off from the tests-first conversation to the verifier. Whatever the conversation produces, the verifier needs this JSON. Once it's approved, it's locked for that PR.

```json
{
  "claims": [
    {
      "id": "c1",
      "text": "An Authorization header with the prefix `bearer` in any letter case authenticates the same as `Bearer`.",
      "kind": "behavior_change"
    }
  ]
}
```

## Fields

- `id`: unique within the PR.
- `text`: one externally visible behaviour, specific enough that a test could disprove it. It describes inputs and outputs, never the implementation.
- `kind`:
  - `behavior_change`: must fail on the old version and pass on the new one.
  - `no_behavior_change`: must pass on both versions.
- `group` (optional): a short area name, such as `"Sending invites"`, used to group claims when a plan is large. Only the display uses it; the verifier ignores it. See [display-scaling.md](../../verification-first-harness/display-scaling.md).

## Rules

- A person approves the claims. The implementing agent can't change them after that.
- The conversation must not pass code or implementation notes to the verifier. The test writer sees only these claims and the API reference.
- When a PR gets new commits, the same claims and tests run again. Editing a claim requires a new approval.
