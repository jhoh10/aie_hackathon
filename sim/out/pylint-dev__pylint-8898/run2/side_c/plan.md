**Task:** `bad-names-rgxs = "(foo{1,3})"` → one regex `(foo{1,3})`, not split at the comma inside `{}`/`()`/`[]`.

| # | Check | Proves |
|---|-------|--------|
| 1 | `_regexp_csv_transfomer("(foo{1,3})")` → 1 pattern `(foo{1,3})` | The reported crash is fixed |
| 2 | Commas inside `{}`, `()` and `[]` (e.g. `a{1,2}`, `(a,b)`, `[a,b]`) stay in one pattern | Common regex comma uses work |
| 3 | `"foo,bar"`, `"a.*, b.*"` still → separate patterns (whitespace stripped) | **Unchanged:** commas outside brackets still split |
| 4 | Mixed: `"(foo{1,3}),bar"` → 2 patterns | Splitting and protection work together |
| 5 | Escaped brackets don't open a group: `a\(,b` → 2 patterns | A stray escaped bracket can't swallow later commas |
| 6 | Invalid regex still gives `ArgumentTypeError` | **Unchanged:** error reporting |
| 7 | Config file with `bad-names-rgxs = "(foo{1,3})"` loads via `Run` without a crash | End-to-end |

Regression scope: `tests/config` · baseline: 75 passed, 0 failed
Skipped: running `tests/test_self.py` and functional tests (slow, only touches shared transformer in `pylint/config/argument.py`); other CSV options keep using `_splitstrip`.

Question: should `\,` also work as an escaped comma? I'll leave it out unless you say so.

Approve, or edit?
