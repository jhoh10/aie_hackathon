| # | Result |
|---|--------|
| 1 | Pass: `(foo{1,3})`, `foo{1,3}`, `a{,3}` each one pattern |
| 2 | Pass: `[a,b]+`, `(a,b)` kept whole |
| 3 | Pass: `foo{1,3},bar` → 2 patterns (plus a 3-way mixed case) |
| 4 | Pass: `a,b,c`, `a, b`, `a,,b,` split/stripped as before |
| 5 | Pass: invalid `(foo{1,3}` still errors cleanly (message now shows the full `(foo{1,3}`) |
| 6 | Pass: rcfile `bad-names-rgxs=(foo{1,3})` loads, one pattern |
| 7 (user-added) | Pass: `a\,b` stays one pattern and matches `"a,b"`; `a\,b,c` → 2 patterns |

**Agent-added:** none beyond the 3-way mixed case in row 3.

**Changed existing test:** `test_csv_regex_error` asserted the buggy split (`(foo{1`); it now passes an invalid `(foo{1,3}` and expects the full text.

**Regression scope** (`tests/config/test_config.py tests/config/test_argparse_config.py`): 36 passed, 0 failed. Baseline was 22 passed, 0 failed, so none new.

**Design:** `_split_regexps` in `pylint/config/argument.py` scans the value, tracking `()`/`{}`/`[]` nesting and backslash escapes. It splits only on top-level unescaped commas. `\,` is left in the regex, where it already matches a literal comma.
Only `regexp_csv` options are affected; plain `csv` options are unchanged.
