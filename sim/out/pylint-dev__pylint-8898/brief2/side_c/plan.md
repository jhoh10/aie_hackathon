**Task:** `bad-names-rgxs` (any `regexp_csv` option) value `(foo{1,3})` → one compiled regex, not split into `(foo{1` and `3})`.

| # | Check | Proves |
|---|-------|--------|
| 1 | `_regexp_csv_transfomer("(foo{1,3})")` → 1 pattern `(foo{1,3})` | the reported case no longer crashes |
| 2 | Commas inside `{}`, `[]`, `()` stay in one pattern (e.g. `a{1,2}`, `[a,b]`, `(x,y)`), incl. mixed with a following separator: `"a{1,2},b"` → 2 patterns | brackets/quantifiers are protected, real separators still split |
| 3 | Via CLI `--bad-names-rgxs="(foo{1,3})"` and via a toml config file: no crash, option holds the one pattern | end-to-end through argparse + config parsing |
| 4 | **Unchanged:** plain `"foo,bar"` → 2 patterns; `" foo , bar "` still stripped; empty value → no patterns; `_csv_transformer` for non-regex options (e.g. `ignore`) still splits on every comma | non-regex CSV behaviour and ordinary splitting unaffected |
| 5 | Genuinely invalid regex (e.g. `(foo`) still gives the "Error in provided regular expression" message | error reporting preserved |

Existing `test_csv_regex_error` asserts the old mangled split (`(foo{1`); it encodes the bug, so I'd change it to use `(foo` as the invalid input (same intent).

Design (my call): split regex CSV on commas only at bracket depth 0 (tracking `{}`, `[]`, `()`, skipping backslash-escaped chars). A comma needed outside brackets can be written `\,`.

Regression scope: `tests/config` · baseline: 75 passed, 0 failed
Skipped: full suite and functional tests (change is confined to `pylint/config/argument.py`); docs/changelog entry beyond a `doc/whatsnew/fragments` note.

Approve, or edit?
