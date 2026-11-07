# Report

All approved rows PASS (tests in `tests/config/test_regexp_csv.py`).

| # | Result |
|---|--------|
| 1-6 | PASS (parametrized splitting, passthrough, invalid regex) |
| 7 | PASS (`test_cli_quantifier_regex`) |
| 8 | PASS (`test_toml_config_quantifier_regex`) |
| 9 | PASS for `tests/config`, `tests/test_self.py`, name checker tests; see note below |
| 10 | PASS (`test_plain_csv_unchanged`) |
| 11 | PASS (`[a,b]`, `(a,b)`, nested, `[(,]x,y`) |
| 12 | PASS (plain multi-pattern lists) |
| 13 | PASS (escaped bracket) |

Agent-added: none.

## Design
`_split_regexp_csv` in `pylint/utils/utils.py` splits on commas at depth 0, tracking `()`/`{}` nesting, `[...]` classes and backslash escapes. `_regexp_csv_transfomer` uses it; plain `csv` options are unchanged. Changelog fragment `doc/whatsnew/fragments/7229.bugfix` added (issue number assumed; adjust if wrong).

## Things to know
- **Existing test changed:** `tests/config/test_config.py::test_csv_regex_error` asserted the buggy behaviour (`(foo{1,3})` failing with "(foo{1"). I changed its input to a genuinely invalid regex `(foo{1,}` with the matching expected message. Its intent (invalid regex gives a clear error) is kept. This was not in the approved plan, so please check it.
- **Unrelated failures:** 6 `tests/test_functional.py` cases (e.g. `recursion_error_3152`) fail with `import-error` because `setuptools` etc. are missing from the venv. I could not run a clean-HEAD comparison (worktree creation needed approval), so this is from reading the failure, not a baseline run.
- Unbalanced opening brackets (e.g. `(foo,bar`) swallow the rest of the string into one item; that regex is invalid anyway and errors as before.
