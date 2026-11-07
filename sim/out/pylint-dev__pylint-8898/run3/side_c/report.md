# Report

| # | Result |
|---|--------|
| 1 | Pass: `--bad-names-rgxs=(foo{1,3})` gives one pattern `(foo{1,3})` |
| 2 | Pass: commas in `{}`, `[]`, `()` are kept |
| 3 | Pass: `foo,bar`, `a{1,3},b` and whitespace/empty handling behave as before |
| 4 | Pass: `\,`, `[,]`, `[\]],x` and `\(a,b` behave as expected. Note: `\{1,3\}` is still split at the comma, because escaped braces don't count as brackets. Use `\{1\,3\}` or `{1,3}` instead. |
| 5 | Pass: `(foo` still gives "Error in provided regular expression" |
| 6 | Pass: toml config with `bad-names-rgxs` works |
| 7 | Pass: `csv` and `regexp_paths_csv` still split on every comma (`glob_paths_csv` is covered indirectly, since it uses the same `_csv_transformer`) |
| user-added | Pass: `(foo{1,3}),(bar{2,4})` gives two patterns (unit and toml) |

**Agent-added:** none beyond the user-added row.

**Changed existing test:** `test_csv_regex_error` used `(foo{1,3})`, which asserted the buggy split. It now uses the genuinely invalid `(foo`.

**Regression scope** (`tests/config`): 91 passed, 0 failed. Baseline was 75 passed, 0 failed, so there are no new failures. The 16 extra passes are the new tests.

**Design note:** `_split_regexps` in `pylint/config/argument.py` splits on commas only at bracket depth 0, honouring backslash escapes and treating `[...]` as a character class.
Only `regexp_csv` uses it; every other csv type keeps the plain split.
