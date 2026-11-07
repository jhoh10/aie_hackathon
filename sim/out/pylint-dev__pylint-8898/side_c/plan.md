**Task:** `bad-names-rgxs` / other `regexp_csv` options: a comma inside a regex (e.g. `(foo{1,3})`) must not split it → one valid compiled pattern.

| # | Check | Proves |
|---|-------|--------|
| 1 | `_regexp_csv_transfomer("(foo{1,3})")` → 1 pattern `(foo{1,3})` | Reported crash fixed |
| 2 | `"foo{1,3},bar"` and `"a, b{2,}, c"` → separate patterns, commas inside `{}` kept | Mixed lists split correctly |
| 3 | `"foo,bar,baz"` (plain list, whitespace/empty items) → same as before | Existing behaviour unchanged |
| 4 | List/tuple input passed through unchanged | API compat |
| 5 | End-to-end: config file with `bad-names-rgxs = "(foo{1,3})"` loads without crash, pattern in config | Real config path works |
| 6 | Invalid regex still gives the existing argparse error message | Error handling unchanged |
| 7 | (user-added) `(a,b)` — comma outside braces — still splits into `(a` and `b)`; `(a` raises the argparse "Error in provided regular expression" | Only commas inside `{}` are protected; others split as before |

Baseline: `tests/config/test_config.py` + `test_argparse_config.py` → 22 passed, no failures.

Skipped: backslash-escaping of commas (brace-aware splitting suffices for the issue and keeps old configs valid); `regexp_paths_csv` (not in the issue).

Approve, or edit?
