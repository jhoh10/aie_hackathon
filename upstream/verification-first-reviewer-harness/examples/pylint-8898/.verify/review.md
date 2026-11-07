# Review decision: Fix bad-names-rgxs mangling regular expressions with commas

Decision: REQUEST_CHANGES
Reviewer: (illustrative) · 2026-11-07
Packet: .verify/review-packet.md

## Comments

| On | Comment | Blocking? | Becomes |
| --- | --- | --- | --- |
| F3 | Don't change how commas inside `( )` behave. Existing configs may rely on `(a,b)` splitting, and the issue only asked for quantifiers. | Yes | new `no_behavior_change` claim: "A comma inside `( )` but outside `{}` still separates two patterns, as before" |
| F4 | Escaped commas were explicitly skipped in the plan. Either drop the escape handling or add it to the plan with a test. | Yes | new claim + check, or remove the behaviour |
| F5 | An unclosed bracket shouldn't silently swallow the rest of the list. | Yes | new claim: "an unclosed `(` or `[` is reported as an invalid regex" |
