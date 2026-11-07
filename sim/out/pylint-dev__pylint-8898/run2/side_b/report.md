# Report: commas in regexp_csv options

All 12 plan rows pass. Tests are in `tests/config/test_regexp_csv.py`.

| # | Result | Test |
|---|--------|------|
| 1-7 | PASS | `test_regexp_csv_splitting` (parametrized), `test_escaped_comma_matches_comma` |
| 8 | PASS | `test_regexp_csv_splitting` (`""`, `","`, `" a , b ,"`) |
| 9 | PASS | `test_unbalanced_raises_argument_type_error` |
| 10 | PASS | `tests/config`, `tests/test_self.py` and the base/design checker tests: 233 passed, 1 xfailed |
| 11 | PASS | `test_cli_and_rcfile` (CLI flag and TOML rcfile both flag `fooo`) |
| 12 | PASS | `test_sequence_passthrough` |

Agent-added checks: none beyond the plan.

## Design
`_split_regexp_csv` in `pylint/config/argument.py` replaces `_csv_transformer` inside `_regexp_csv_transfomer`. It splits only on commas outside `()`, `{}` and `[]` and not backslash-escaped. Other csv options and `_check_csv` are unchanged.

## What went wrong on the way
- The first CLI test wrongly expected `SystemExit`. I corrected it before the fix.
- The existing `tests/config/test_config.py::test_csv_regex_error` used `(foo{1,3})` and asserted the mangled error `(foo{1`. That test encoded the bug itself, so I changed its input to the genuinely invalid `(foo{1,3}` and the expected message to match. It still checks that an invalid regex gives a clean error. This test was not in the approved plan, so it needs a look from you.
