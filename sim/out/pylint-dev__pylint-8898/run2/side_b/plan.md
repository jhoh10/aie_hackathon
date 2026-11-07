# Test plan: commas in regexp_csv options (status: APPROVED)

| # | Type | Check | Proves |
|---|------|-------|--------|
| 1 | Unit | `_regexp_csv_transfomer("(foo{1,3})")` -> one pattern `(foo{1,3})` | The issue case no longer crashes or gets mangled |
| 2 | Unit | `"foo{1,3}"` (quantifier only) -> one pattern | A comma inside braces is kept |
| 3 | Unit | `"[a,b]x"` -> one pattern | A comma inside a character class is kept |
| 4 | Unit | `"(a,b)"` -> one pattern | A comma inside a group is kept |
| 5 | Unit | `r"a\,b"` -> one pattern (escaped comma) | The escape workaround the issue asks for |
| 6 | Unit | `"a,b"` -> two patterns `a`, `b` | Plain comma separation still works |
| 7 | Unit | `"(foo{1,3}),bar,[x,y]{2,4}"` -> three patterns | Mixed top-level and nested commas |
| 8 | Edge | `""`, `","`, `" a , b ,"` -> empties dropped, whitespace stripped | Same whitespace and empty handling as before |
| 9 | Edge | Unbalanced `"(a,b"` raises `ArgumentTypeError` (not a crash) | Bad regex still gives a clean error |
| 10 | Regression | Existing `tests/config` and `tests/test_self.py` pass | Nothing else broke (`_check_csv` and `_csv_transformer` unchanged) |
| 11 | Integration | Run `pylint` with `--bad-names-rgxs="(foo{1,3})"` and an rcfile with the same value on a file with a `fooo` variable | CLI and config-file paths work end to end and the name is flagged as bad |
| 12 | Backward compat | List/tuple input to the transformer is passed through | Programmatic callers are unaffected |

Considered and skipped:
- Property-based (hypothesis) test: there is no oracle beyond the examples above, and hypothesis may not be installed.
- Changing `_check_csv` for all csv options: it would change behaviour of non-regex options, and the issue is only about regexes.
- `regexp_paths_csv`: its values are paths, not general regexes, so it is out of scope.
