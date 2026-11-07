# Verification report

Command: `pytest tests/config tests/utils tests/checkers tests/test_self.py` -> 610 passed, 45 skipped, 5 xfailed.

| # | Check | Result | Test |
|---|-------|--------|------|
| 1 | `(foo{1,3})` is one pattern | PASS | `test_check_regexp_csv_splits_outside_braces[0]` |
| 2 | `foo{1,3},bar`; `a,b{2,},c{,4}` | PASS | params 1, 2 |
| 3 | `a, b ,,c` strip/drop empties | PASS | param 3 |
| 4 | list/tuple pass-through | PASS | `test_check_regexp_csv_passes_sequences_through` |
| 5 | `a{1,2}b{3,4},c` | PASS | param 4 |
| 6 | unclosed `{` does not crash | PASS | param 6 (plus `test_csv_regex_error` for the regex error message) |
| 7 | toml config `bad-names-rgxs = "(foo{1,3})"` | PASS | `test_csv_regex_quantifier_comma_config_file` |
| 8 | existing regression suites | PASS | see command above |
| 9 | `(foo{1,3}),(bar)` | PASS | param 5, `test_regexp_csv_transformer_keeps_quantifier_comma` |
| 10 | `--bad-names-rgxs=...` on the command line | PASS | `test_csv_regex_quantifier_comma_command_line` |

Agent-added: empty string gives no patterns (param 7).

## Design notes
- New `_check_regexp_csv` in `pylint/utils/utils.py` splits on commas outside `{...}`, strips, and drops empties.
- `_regexp_csv_transfomer` uses it. Command line, config files and string defaults all go through that one argparse type function, so all paths get the fix.
- Changelog fragment `doc/whatsnew/fragments/+regexp-csv-quantifier-comma.bugfix` added. It has no issue number because the number is unknown (towncrier `+name` orphan fragment).

## What went wrong / deviations
- The existing `test_csv_regex_error` asserted the buggy behaviour (it expected `(foo{1` from `--bad-names-rgx=(foo{1,3})`). It had to change: I now pass the genuinely invalid `(foo{1,3}` and expect the same kind of error. Engineer confirmed this edit is fine.
- My first batch of test edits was rejected by the shell and not applied; I redid them with the edit tools before running anything.
- Known limitation: commas in `[...]` character classes still split.
