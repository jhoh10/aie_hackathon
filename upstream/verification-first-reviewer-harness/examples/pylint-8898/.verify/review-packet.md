# Review: Fix bad-names-rgxs mangling regular expressions with commas (pylint issue 8822)

**Regex-list options stop splitting on commas that belong to a regular expression.**

Claims proven 11/11 (author's report) · Tests 5 new, 1 changed · Untested behaviours 3

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | Comma in `{m,n}` split the regex → kept whole | T1, T5 |
| F2 | Comma in `[...]` split the regex → kept whole | T2 |
| F3 | Invalid-regex error showed fragment → shows full pattern | T6 |
| F4 | Comma inside `(...)`, e.g. `(a,b)`, split → kept whole | **No test** |
| F5 | Backslash-escaped comma `\,` split → kept in pattern | **No test** |
| F6 | Unclosed `(` or `[` now swallows later commas into one pattern | **No test** |

## Tests

| # | Input | Expected output |
| --- | --- | --- |
| T1 | `(foo{1,3})` · `(foo{1,3}),bar` · `a{1,2},b{2,3}` | `(foo{1,3})` · `(foo{1,3})`, `bar` · `a{1,2}`, `b{2,3}` |
| T2 | `[a,b],c` | `[a,b]`, `c` |
| T3 | `foo,bar` · `foo, bar` · `foo,bar,` · empty string | `foo`, `bar` (same for first three) · no patterns |
| T4 | `(foo` · already-compiled list | ArgumentTypeError · list returned unchanged |
| T5 | `--bad-names-rgxs=(foo{1,3})` on CLI · same in pyproject.toml | one pattern `(foo{1,3})` |
| T6 | `--bad-names-rgx=(foo{1,3}` | error names `(foo{1,3}` (changed; was `(foo{1,3})` crashing with `(foo{1`) |
