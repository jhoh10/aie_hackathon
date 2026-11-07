**Task:** regex-list options (e.g. `bad-name-rgxs = "(foo{1,3})"`) → split on commas only outside `{}`/`()`/`[]`, so valid regexes with commas compile instead of crashing.

| # | Check | Proves |
|---|-------|--------|
| 1 | `(foo{1,3})`, `foo{1,3}`, `a{,3}` each yield one pattern | Reported crash fixed; quantifier commas kept |
| 2 | `[a,b]+` and `(a,b)` stay one pattern | Commas in char classes / groups are kept |
| 3 | `foo{1,3},bar` → two patterns (`foo{1,3}`, `bar`) | Mixed: separator comma still splits |
| 4 | **Unchanged:** `a,b,c` and `a, b` still give separate (stripped) patterns; empty items skipped | Plain comma lists behave as before |
| 5 | `--bad-names-rgx=(foo{1,3}` (genuinely invalid) still errors with "Error in provided regular expression" | Invalid regex still reported cleanly |
| 6 | Config file `bad-name-rgxs = "(foo{1,3})"` loads without crash (via `Run`) | End-to-end |

Regression scope: `tests/config/test_config.py tests/config/test_argparse_config.py` · baseline: 22 passed, 0 failed
Skipped: other csv options (non-regex) — unchanged; full suite — out of scope.
Note: existing `test_csv_regex_error` asserts the buggy split (`(foo{1`); I'd update it to the new behaviour (row 5).

Approve, or edit?
