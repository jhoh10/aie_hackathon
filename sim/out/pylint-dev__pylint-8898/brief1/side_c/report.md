| # | Result |
|---|--------|
| 1 | Pass: `(foo{1,3})` is one pattern |
| 2 | Pass: `a{1,2},b[x,y]` → `a{1,2}`, `b[x`, `y]` |
| 3 | Pass: `foo{1,3},bar,(a,b)` → 4 pieces; `(a,b)` → `(a`, `b)` |
| 4 | Pass: commas outside `{}` still split; whitespace stripped, empties dropped |
| 5 | Pass: `ok,(foo` errors naming `(foo` |
| 6 | Pass: `--bad-names-rgx=(foo{1,3})` runs without error |

**Agent-added:** none.

**Changed existing test:** `test_csv_regex_error` asserted the old mangled error (`(foo{1`). It now uses `ok,(foo` and expects the error to name `(foo`.

**Regression** (`tests/config/test_config.py tests/config/test_argparse_config.py`): 28 passed, 0 failed. Baseline was 22 passed, 0 failed. The 6 extra are the new tests; none new failing.

**Design:** new `_check_regexp_csv` in `pylint/utils/utils.py` splits on commas outside a `{...}` (an unclosed `{` is literal). `_regexp_csv_transfomer` uses it, so every `regexp_csv` option benefits. `regexp_paths_csv` is untouched.
