| # | Result |
|---|--------|
| 1 | Pass: `(foo{1,3})` is one pattern |
| 2 | Pass: commas inside `{}`, `()`, `[]` stay in one pattern |
| 3 | Pass: `foo,bar` and `a.*, b.*` still split |
| 4 | Pass: `(foo{1,3}),bar` gives 2 patterns |
| 5 | Pass: `a\(,b` gives 2 patterns |
| 6 | Pass: invalid regex still raises `ArgumentTypeError` |
| 7 | Pass: toml config with `bad-names-rgxs = "(foo{1,3})"` loads |

**Agent-added / requested:** `\,` is not a split point (`a\,b,c` gives `a\,b`, `c`). `[(,]x` is one pattern, so brackets inside a character class are literal.

**Changed existing test:** `test_csv_regex_error` used `(foo{1,3})`, which asserted the old buggy split. It now uses the genuinely invalid `(foo{1,3}`.

**Regression scope (`tests/config`):** 87 passed, 0 failed. Baseline was 75 passed, and the 12 extra are the new tests. No new failures.

**Design:** `_split_regexps` in `pylint/config/argument.py` is a small scanner. It tracks `()`/`{}` depth and `[...]` classes, and skips backslash-escaped characters. It splits only on top-level commas. The `\,` stays in the pattern, which `re` reads as a literal comma.
