# Example: pylint-dev__pylint-8898

A real pull request from our evaluation runs (SWE-bench Verified, `pylint-dev__pylint-8898`, developer harness, run 1), reviewed with [review-prompt.md](../../review-prompt.md).

**The issue:** pylint splits regex options such as `bad-names-rgxs` on every comma, so `(foo{1,3})` is cut into `(foo{1` and `3})` and pylint crashes.

## Files

| File | What it is |
| --- | --- |
| [pr.diff](pr.diff) | The change the developer agent made |
| [.verify/plan.md](.verify/plan.md) | The 11 checks the engineer approved before any code was written |
| [.verify/report.md](.verify/report.md) | The developer agent's own report: all checks pass |
| [.verify/review-packet.md](.verify/review-packet.md) | **The review packet**, about 260 words, generated from the diff in about 30 seconds |
| [review.html](review.html) | The packet as the reviewer's page (from [ui/render.py](../../ui/render.py)) |
| [.verify/review.md](.verify/review.md) | A reviewer decision written from the packet (illustrative) |

## What the packet caught

Every approved check passed, and the author's report said so. A reviewer reading only the report, or a verifier proving only the approved claims, would approve.

The packet's "What the PR does" has 3 covered lines and 3 marked **No test**:
- **F4:** a comma inside `(...)`, e.g. `(a,b)`, is now kept whole. Before, it split.
- **F5:** a backslash-escaped comma is now kept in the pattern.
- **F6:** an unclosed `(` or `[` now swallows later commas into one pattern.

There is no Architecture section: the change adds a private helper inside pylint's utils and changes one internal call, which isn't a high-level change.

F4 is exactly why this change **failed the project's real hidden test**. Upstream kept splitting on commas inside `( )`, and the hidden test depends on it. The reviewer sees it in the first section without opening the diff.

## How the packet got here

- **v1** grouped "commas inside `{}`, `[]` and `()` are kept" into one item. It linked that item to the claims that tested `{}` and `[]`, which hid the untested `()` case. Fix: a behaviour counts as covered only if a test's input actually triggers it.
- **v2** was correct but long: about 1,000 words, with a 7-item "Needs a human look" section.
- **v3** was about half that (500 words). At most 5 covered lines of 15 words each, plus one line per untested behaviour. No separate problems section.
- **v4** was about 290 words, with tighter limits in every section. Its first attempt merged "comma in `(…)` or `{m,n}`" into one covered row, because `(foo{1,3})` *looks* like it tests both. That hid the `()` gap again. Fix: a covered row may only name a case that some test input exercises on its own, and when rows must be merged, merge covered rows, never untested ones.
- **v5 (this one)** shows a section only when it has something to say. Architecture appears only for high-level changes (components, public APIs, config, dependencies, data); this pure code change has none.
