# Report

Plan revised per engineer: only commas inside a quantifier's `{...}` are protected; `( )` and `[ ]` still split; no `\,` escape.

| # | Result |
|---|--------|
| 1 | Pass: `(foo{1,3})` → one pattern |
| 2 | Pass: `{1,3}`, `{,3}`, `{2,}` protected; `a{1,2},b` → 2 patterns |
| 3 | Pass: CLI `--bad-names-rgxs` and toml config both hold `(foo{1,3})` |
| 4 | Pass: `foo,bar`, stripping, empty value, `(a,b)` → `(a`,`b)`, `[a,b]` → `[a`,`b]`, `_csv_transformer` unchanged |
| 5 | Pass: invalid `(foo` still gives "Error in provided regular expression" |

Agent-added: `(a,b)` through `_regexp_csv_transfomer` still raises `ArgumentTypeError`; `foo,,bar,` drops empties.

Changed existing test: `test_csv_regex_error` now uses `(foo` (old input `(foo{1,3})` asserted the bug).

Regression (`tests/config`): 91 passed, 0 failed. Baseline was 75 passed, 0 failed; none new.

Design: new `_check_regexp_csv` splits on commas except those within `\{\d*,\d*\}`, used by `_regexp_csv_transfomer` only. `_csv_transformer` is untouched. Added `doc/whatsnew/fragments/7229.bugfix`.
