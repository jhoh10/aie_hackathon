# Test plan: commas in regexp_csv options (bad-names-rgxs etc.)

Approach: when splitting a `regexp_csv` value on commas, re-join adjacent pieces until the piece compiles as a regex (so `(foo{1,3})` survives). A genuinely invalid regex still errors.

| # | Type | Check | Proves |
|---|------|-------|--------|
| 1 | Unit | `_regexp_csv_transfomer("(foo{1,3})")` gives one pattern `(foo{1,3})` | Issue case fixed |
| 2 | Unit | `"foo,bar"` gives two patterns | Plain csv unchanged |
| 3 | Unit | `"(foo{1,3}),bar"` gives two patterns, first keeps its comma | Mixed |
| 4 | Unit | `"a{1,2},b{2,3}"` gives two patterns | Several comma regexes |
| 5 | Unit | `"[a,b],c"` gives `[a,b]` and `c` | Comma in character class |
| 6 | Unit | `"foo, bar"`, trailing comma, empty string: stripped, empties dropped | Existing whitespace/empty behaviour |
| 7 | Error | `"(foo"` raises ArgumentTypeError | Truly invalid regex still reported |
| 8 | Unit | list/tuple input passes through unchanged | Backward compat |
| 9 | Integration | `--bad-names-rgxs="(foo{1,3})"` via CLI: no crash, option holds one pattern | End-to-end CLI |
| 10 | Integration | Same via toml config (`[tool.pylint.basic]`) | End-to-end config (issue's setup) |
| 11 | Regression | existing tests/config and tests/utils suites | Nothing else breaks |

Considered and skipped:
- Escape syntax for commas: re-joining makes it unnecessary and would change the format.
- Plain `csv` options: commas are separators by design.
- `regexp_paths_csv`: path patterns, outside the issue's scope.

Also: add a doc/whatsnew fragment (not a test).

Status: APPROVED
