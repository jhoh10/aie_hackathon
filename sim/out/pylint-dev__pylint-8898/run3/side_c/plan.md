**Task:** `bad-names-rgxs` and other `regexp_csv` options: `"(foo{1,3})"` → one valid compiled regex (commas inside `{}`, `()`, `[]` no longer split) instead of a crash.

| # | Check | Proves |
|---|-------|--------|
| 1 | `bad-names-rgxs="(foo{1,3})"` loads without error and yields one pattern `(foo{1,3})` | Reported crash fixed |
| 2 | Commas inside `{}`, `[]`, `()` are kept (`a{1,3}`, `[a,b]`, `(x,y)`) | Bracket-aware splitting |
| 3 | Commas outside brackets still split: `foo,bar` → 2; `a{1,3},b` → 2; whitespace stripped, empty items dropped, as before | Existing splitting unchanged |
| 4 | Escaped brackets/commas (`\{1,3\}`, `[,]`, `\,`) don't unbalance the split | Edge cases |
| 5 | Truly invalid regex (`(foo`) still gives "Error in provided regular expression" | Error reporting unchanged |
| 6 | Same pattern works from a toml config file | Config path works too |
| 7 | Other csv types (`csv`, `glob_paths_csv`, `regexp_paths_csv`) still split on every comma | Not changed |

Regression scope: `tests/config` · baseline: 75 passed, 0 failed
Skipped: full suite and checker tests (change is confined to the `regexp_csv` transformer).
Note: existing `test_csv_regex_error` asserts the buggy split (`(foo{1`). It must change to use a genuinely invalid regex; I'll list it in the report.

Approve, or edit?
