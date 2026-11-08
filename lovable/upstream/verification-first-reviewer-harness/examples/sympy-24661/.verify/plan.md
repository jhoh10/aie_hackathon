# Test plan: parse_expr(evaluate=False) for relationals

Task: `parse_expr('1 < 2', evaluate=False)` must return `Lt(1, 2, evaluate=False)` (unevaluated), likewise for `>, <=, >=, ==, !=`.
Fix location: `EvaluateFalseTransformer` in sympy/parsing/sympy_parser.py (add `visit_Compare`).

| # | Type | Check | Proves |
|---|------|-------|--------|
| 1 | Unit | `parse_expr('1 < 2', evaluate=False)` == `Lt(1, 2, evaluate=False)` and is not `True` | Issue example fixed |
| 2 | Unit (parametrized) | Same for `>`, `<=`, `>=`, `==`, `!=` against Gt/Le/Ge/Eq/Ne with evaluate=False | All single comparison ops covered |
| 3 | Unit | Symbolic: `x < y`, `x + 1 > y` with evaluate=False give unevaluated relational with operands built via evaluate=False | Nested operands stay unevaluated |
| 4 | Edge | Nested: `(1 < 2) & (3 > 2)` gives `And(Lt(..), Gt(..), evaluate=False)` | Composes with other transformed ops |
| 5 | Edge | Chained `1 < 2 < 3` with evaluate=False gives `And(Lt(1,2,evaluate=False), Lt(2,3,evaluate=False), evaluate=False)`, not `True` (engineer-amended) | Chains respect evaluate=False |
| 6 | Regression | `parse_expr('1 < 2')` (default) still `True`; `x < y` unchanged | Default path unchanged |
| 7 | Regression | All existing tests in sympy/parsing/tests/test_sympy_parser.py pass | No existing behaviour broken |

Considered and skipped: `in`/`is`/`not in` ops (no SymPy relational equivalent; left as-is); property-based tests (small closed operator set, parametrized test suffices).

Status: APPROVED (with #5 amended by engineer)
