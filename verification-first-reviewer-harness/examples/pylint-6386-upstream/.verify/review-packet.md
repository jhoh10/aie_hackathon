# Review: Fix the short verbose option -v expecting an argument (pylint issue 6386)

**Makes the short `-v` flag enable verbose mode without needing an argument.**

No approved claims · Tests 1 new, 0 changed · Untested behaviours 1

## What the PR does

| # | Behaviour change | Tests |
| --- | --- | --- |
| F1 | `-v` expects an argument → enables verbose mode | T1 |
| F2 | Help for `--verbose`, `--enable-all-extensions` shows argument placeholder → none | **No test** |

## Tests

| # | Input | Expected output |
| --- | --- | --- |
| T1 | Run on empty module with `-v` | stderr contains "Using config file" |
