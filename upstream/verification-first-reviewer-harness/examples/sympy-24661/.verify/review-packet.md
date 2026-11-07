# Review: Respect evaluate=False for comparisons in parse_expr (sympy issue 24288)

**parse_expr(evaluate=False) now keeps comparisons unevaluated instead of returning True/False.**

Claims proven 7/7 (author's report) · Tests 1 new, 0 changed · Untested behaviours 0

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | `1 < 2` etc.: True/False → unevaluated relational | T1 |
| F2 | Operands inside comparisons: evaluated → unevaluated | T2 |
| F3 | Chained or `&`-joined comparisons: bool → unevaluated And | T3, T4 |

## Tests

| # | Input | Expected output |
| --- | --- | --- |
| T1 | `1<2` · `1>2` · `1<=2` · `1>=2` · `1==2` · `1!=2` (evaluate=False) | Lt/Gt/Le/Ge/Eq/Ne with args (1, 2), unevaluated |
| T2 | `x < y` · `x + 1 > y` (evaluate=False) | Unevaluated Lt / Gt, with unevaluated Add |
| T3 | `(1 < 2) & (3 > 2)` (evaluate=False) | Unevaluated And of unevaluated Lt, Gt |
| T4 | `1 < 2 < 3` (evaluate=False) | Unevaluated And(Lt(1,2), Lt(2,3)), not True |
| T5 | `1 < 2` · `x < y` (default) | `S.true` · `Lt(x, y)` (unchanged) |
