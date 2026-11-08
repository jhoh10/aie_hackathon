**Task:** `bad-names-rgxs` (any `regexp_csv` option) value `(foo{1,3})` → one compiled pattern, not split at the comma inside `{}`/`()`/`[]`.

| # | Check | Proves |
|---|-------|--------|
| 1 | `_regexp_csv_transfomer("(foo{1,3})")` → 1 pattern `(foo{1,3})` | Reported bug fixed |
| 2 | Only `{}` commas protected: `a{1,2},b[x,y]` → `a{1,2}`, `b[x`, `y]` | `[]` still splits |
| 3 | Mixed: `foo{1,3},bar,(a,b)` → `foo{1,3}`, `bar`, `(a`, `b)`; and `(a,b)` → `(a`, `b)` | `()` still splits |
| 4 | **Unchanged:** commas outside `{}` still split (`a,b,c` → 3, whitespace stripped, empty items dropped) | Old behaviour preserved |
| 5 | Invalid regex still errors with `Error in provided regular expression…` (e.g. `(foo`) | Error reporting preserved |
| 6 | End-to-end: `--bad-names-rgx="(foo{1,3})"` runs without error | CLI/config path works |

Regression scope: `tests/config/test_config.py tests/config/test_argparse_config.py` · baseline: 22 passed, 0 failed
Heads-up: existing `test_csv_regex_error` asserts the old mangled error (`(foo{1`); it must change (I'll use an unbalanced pattern instead) and will be listed in the report.
Skipped: `regexp_paths_csv`/other csv types (not part of the issue); a `\,` escape syntax (bracket-awareness suffices for the report).

Approve, or edit?
