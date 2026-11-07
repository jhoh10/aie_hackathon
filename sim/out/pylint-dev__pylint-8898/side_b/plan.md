# Test plan: commas inside regexes in `regexp_csv` options (bad-names-rgxs etc.)

Design (my call): add a splitter that splits on commas except inside `{...}` quantifier braces; use it in `_regexp_csv_transfomer`. Plain `csv` options unchanged.

| # | Type | Check | Proves |
|---|------|-------|--------|
| 1 | Unit | `_regexp_csv_transfomer("(foo{1,3})")` gives one pattern `(foo{1,3})` | Issue case no longer crashes/mangles |
| 2 | Unit | `"foo{1,3},bar"` gives 2 patterns: `foo{1,3}`, `bar` | Quantifier plus real separator |
| 3 | Unit | `"a, b ,c"` and `"a,,b,"` give `a,b,c` / `a,b` | Old csv behaviour (strip, drop empties) kept |
| 4 | Unit | `"x{2},y{1,}"` and `"a{,3},b"` | Multiple braces, open-ended quantifiers |
| 5 | Unit | list/tuple input passes through unchanged | Backward compat for already-parsed values |
| 6 | Error handling | invalid regex (`"(foo"`) still raises `argparse.ArgumentTypeError` | Error path unchanged |
| 7 | Integration | pylint run with `--bad-names-rgxs="(foo{1,3})"` on a file with var `fooo` reports `disallowed-name`, no crash | End-to-end via CLI |
| 8 | Integration | same via a toml config file | Config-file path from the issue |
| 9 | Regression | existing `tests/config`, name-checker tests, `tests/test_self.py` pass | Nothing else broke |
| 11 | Unit | `"[a,b]"`, `"(a,b)"`, `"(a,(b,c)),d"` split only at top-level commas | Commas in classes/groups/nesting (user-requested) |
| 12 | Unit | `"a,b,c"` and `"^foo,bar$,baz.*"` plain multi-pattern list | Simple list (user-requested) |
| 13 | Unit | escaped bracket `"\[a,b"` splits at the comma | Backslash escapes honoured |
| 10 | Regression | `_csv_transformer("a{1,3}")` still splits on the comma | Scope limited to regexp_csv |

Considered and skipped:
- Backslash-escaped commas (`\,`): ambiguous with regex escapes; brace-aware splitting covers the real need.
- Property-based tests: no hypothesis dependency in repo.
- Changelog: will add a `doc/whatsnew/fragments` entry (not a test).

Status: APPROVED (with user additions 11-13; splitter now handles (), [], {} with nesting and escapes)
