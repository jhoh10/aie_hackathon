# Review: Fix bad-names-rgxs mangling regular expressions with commas (pylint issue 8822)

**Regex-list options keep commas inside parentheses, brackets and quantifiers instead of splitting.**

Claims proven 11/11 (author's report) · Tests 12 new, 1 changed · Untested behaviours 3

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | Comma in `{m,n}` or `[…]` split regex → kept whole | T1, T2, T5 |
| F2 | Plain comma lists, spaces, empty items → unchanged | T3 |
| F3 | Comma inside `(…)` split regex → kept whole | **No test** |
| F4 | Backslash-escaped comma split regex → kept whole | **No test** |
| F5 | Unbalanced `(` or `[` now swallows later commas | **No test** |

## Tests

| # | Input | Expected output |
| --- | --- | --- |
| T1 | `(foo{1,3})` · `(foo{1,3}),bar` · `a{1,2},b{2,3}` | `(foo{1,3})` · `(foo{1,3})`, `bar` · `a{1,2}`, `b{2,3}` |
| T2 | `[a,b],c` | `[a,b]`, `c` |
| T3 | `foo,bar` · `foo, bar` · `foo,bar,` · empty string | `foo`, `bar` (first three) · no patterns |
| T4 | `(foo` · `--bad-names-rgx=(foo{1,3}` | Invalid-regex error (changed; was input `(foo{1,3})`, error text `(foo{1`) |
| T5 | `--bad-names-rgxs=(foo{1,3})` on CLI · same in pyproject.toml | One pattern `(foo{1,3})` |
| T6 | List of compiled patterns | Returned unchanged |

## Architecture

| # | Change | Where |
| --- | --- | --- |
| A1 | New bracket-aware comma splitter `_split_regexp_csv` | `pylint/utils/utils.py` |
| A2 | Regex-list transformer uses it instead of plain csv split | `pylint/config/argument.py` |
| A3 | Export `_check_regexp_csv` | `pylint/utils/__init__.py` |
