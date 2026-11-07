# Report

| # | Result |
|---|--------|
| 1 | Pass: `(foo{1,3})` → one pattern (`test_regexp_csv_transformer_splitting`) |
| 2 | Pass: `foo{1,3},bar`, `a, b{2,}, c` split correctly (same test) |
| 3 | Pass: `foo,bar,baz` and ` foo , ,bar,` unchanged (same test) |
| 4 | Pass: `test_regexp_csv_transformer_sequence_input` |
| 5 | Pass: `test_bad_names_rgxs_with_comma_in_config_file` (rcfile loads, pattern `(foo{1,3})`) |
| 6 | Pass: `test_csv_regex_error` still gives the argparse error message |
| 7 | Pass (user-added): `test_csv_regex_comma_outside_braces_splits`. `(a,b)` splits into `(a` and `b)`, and `(a` errors. |

**Agent-added:** none.

**Changed existing test:** `test_csv_regex_error` asserted the old behaviour (`(foo{1,3})` mangled into `(foo{1`). It now uses an actually unbalanced `(foo{1,3}` and expects the error to show the whole `(foo{1,3}`.

**Baseline failures / full suite:** the baseline run covered only `tests/config` (22 passed). The full suite (excluding `tests/profile` and `tests/testutils/_primer`, which need the missing `git` module) gave 1827 passed and 3 failed: `test_functional[recursion_error_3152]`, `[recursion_error_3159]` and `[unbalanced_tuple_unpacking]`. They are unrelated to regex options (for example, an unexpected `no-value-for-parameter`). Confirmed pre-existing: with the `argument.py` change reverted, all three still fail identically (3 failed), so they are not caused by this fix.

**Design note:** `_check_regexp_csv` in `pylint/utils/utils.py` splits on commas only when outside `{...}`. `_regexp_csv_transfomer` uses it, and `regexp_paths_csv` and the plain `csv` type are unchanged.
Commas outside braces still separate patterns, so existing configs behave as before.
