# Example: sympy__sympy-24661

**The issue:** `parse_expr('1 < 2', evaluate=False)` returns `True` instead of an unevaluated `1 < 2`.

**The change:** written by the developer harness (Side B of our first evaluation run) against 7 approved claims. It resolved the real hidden test.

**The packet:** about 210 words. Three behaviour lines (all six comparison operators, unevaluated operands, chains and `&`), each tied to a test. There are no untested behaviours, and no Architecture section because nothing structural changed. This is what a clean PR looks like to the reviewer: one screen, nothing flagged.

Files: [pr.diff](pr.diff) · [.verify/plan.md](.verify/plan.md) · [.verify/report.md](.verify/report.md) · [.verify/review-packet.md](.verify/review-packet.md) · [review.html](review.html)
