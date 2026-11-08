# Review: Fix bad-names-rgxs mangling regular expressions with commas (pylint issue 8822)

**Stops regex lists splitting on commas inside braces, brackets, groups or after backslashes.**

No approved claims · Tests 4 new, 1 changed · Untested behaviours 1

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | `{1,3}` comma split pattern → kept whole | T1 |
| F2 | Comma in `[]`, `()` or after `\` split → kept | T2, T3, T4 |
| F3 | Unterminated pattern error shows split fragment → full pattern | T5 |
| F4 | Unclosed `{`, `[` or `(`: later commas split → not split | **No test** |

## Tests

| # | Input | Expected output |
| --- | --- | --- |
| T1 | `--bad-names-rgx=(foo{1,3})` | one pattern `(foo{1,3})`, no error |
| T2 | `[a,b]` · `[a,b]x,foo` · `(a,b)` · `(a,(b,c)),d` · `a\,b,c` (splitter) | `[a,b]` · `[a,b]x`, `foo` · `(a,b)` · `(a,(b,c))`, `d` · `a\,b`, `c` |
| T3 | `--bad-names-rgx=[a,b]` | one pattern `[a,b]` |
| T4 | `--bad-names-rgx=(a,b)` | one pattern `(a,b)` |
| T5 | `--bad-names-rgx=(foo{1,3}` | error names `(foo{1,3}` (changed; was `(foo{1`) |
