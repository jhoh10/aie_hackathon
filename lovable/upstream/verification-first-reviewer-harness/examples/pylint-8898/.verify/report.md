# Report

All plan rows pass (tests in `tests/config/test_regexp_csv.py`; run: 695 passed, 47 skipped, 5 xfailed across tests/config, utils, test_self, checkers, lint).

| # | Result |
|---|--------|
| 1-6 | PASS (parametrized splitting cases) |
| 7 | PASS (`(foo` still raises ArgumentTypeError) |
| 8 | PASS (list passthrough) |
| 9 | PASS (CLI) |
| 10 | PASS (toml) |
| 11 | PASS (existing suites; one existing test updated, see below) |

Agent-added: none beyond the plan.

## Design
- New `_split_regexp_csv` / `_check_regexp_csv` in `pylint/utils/utils.py`. It splits on commas outside `()`, `[]`, `{m,n}` and backslash escapes. `_regexp_csv_transfomer` uses it. Other csv options are untouched.
- The planned "re-join until it compiles" approach was dropped: `a{1` compiles as a literal, so `a{1,2},b` would have split wrongly.
- Whatsnew fragment `doc/whatsnew/fragments/7229.bugfix`.

## What went wrong
- The first design failed on row 4 reasoning (above), so I changed approach before implementing.
- Existing `tests/config/test_config.py::test_csv_regex_error` asserted the bug (it expected `(foo{1,3})` to crash). I changed its input to the truly invalid `(foo{1,3}` and its expected message accordingly. The intent is unchanged. This is not an approved-plan test, but please confirm.
- A literal unbalanced `(` or `[` in one regex swallows later commas. Such a regex is invalid anyway, so it errors.
