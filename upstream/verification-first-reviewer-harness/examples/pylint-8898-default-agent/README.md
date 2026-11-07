# Example: pylint-dev__pylint-8898, default agent

**The issue:** pylint splits regex options such as `bad-names-rgxs` on every comma, so `(foo{1,3})` crashes.

**The change:** written by Claude Code with no harness (Side A, run 3 of our evaluation). There is no approved plan and no author's report. It failed the project's hidden test, for the same reason as the [harness example](../pylint-8898/): commas inside `( )` stopped splitting.

**The packet:** about 210 words. The header says "No approved claims", so every behaviour is judged by its tests alone. Unlike the harness run, this agent *did* test `(a,b)` staying whole (T4). So the packet shows the parentheses change as a tested, deliberate behaviour (F2), not as a gap. The reviewer still sees it in one line and can object if existing configs rely on the old split. One behaviour has no test: unclosed brackets swallow later commas (F4).

Files: [pr.diff](pr.diff) · [.verify/review-packet.md](.verify/review-packet.md) · [review.html](review.html)
