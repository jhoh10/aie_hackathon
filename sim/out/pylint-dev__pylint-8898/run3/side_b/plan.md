# Test plan: commas inside regex quantifiers in `regexp_csv` options (bad-names-rgxs etc.)

Design: new `_check_regexp_csv` in pylint/utils/utils.py that splits on commas except inside `{...}`; used by `_regexp_csv_transfomer`.

| # | Type | Check | Proves |
|---|------|-------|--------|
| 1 | Unit | `_regexp_csv_transfomer("(foo{1,3})")` -> one pattern `(foo{1,3})` | Issue repro fixed |
| 2 | Unit | `"foo{1,3},bar"` -> `["foo{1,3}","bar"]`; `"a,b{2,},c{,4}"` -> 3 patterns | Quantifier commas kept, real separators still split |
| 3 | Unit | Existing behaviour: `"a, b ,,c"` -> `a`,`b`,`c` (strip, drop empties) | Backward compat |
| 4 | Unit | list/tuple input passed through unchanged | Backward compat with `_check_csv` |
| 5 | Unit | Multiple quantifiers `"a{1,2}b{3,4},c"` | Brace state resets after `}` |
| 6 | Unit | Unclosed `{`, e.g. `"a{1,2"`: no crash in splitter (invalid regex then reported as ArgumentTypeError) | Error handling |
| 7 | Integration | Config file (toml) with `bad-name-rgxs = "(foo{1,3})"` loads, no crash, option value is the compiled pattern | End-to-end issue scenario |
| 8 | Regression | Existing tests: tests/config, tests/utils, tests/checkers/unittest_design / name tests | Nothing else broken |
| 9 | Unit | `"(foo{1,3}),(bar)"` -> `(foo{1,3})`, `(bar)` (added by engineer) | Quantifier comma plus real separator |
| 10 | Integration | `--bad-names-rgxs="(foo{1,3}),(bar)"` on the command line gives the same compiled patterns (added by engineer) | CLI path fixed like config path |

Considered and skipped: escaping commas with backslash (not requested; `{}`-aware split suffices); commas in `[...]` classes (`[a,b]` would still split; documented limitation); changing plain `csv` options.

Status: APPROVED (rows 9 and 10 added by engineer)
