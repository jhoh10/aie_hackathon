# Example: pylint-dev__pylint-6386, upstream fix

**The issue:** the short option `-v` expects an argument, while `--verbose` doesn't.

**The change:** the real fix by pylint's maintainers (the SWE-bench gold patch plus its test), reviewed as if it were a new PR. There is no approved plan.

**The packet:** about 120 words. `-v` now enables verbose mode without an argument (tested). The help text for `--verbose` and `--enable-all-extensions` no longer shows an argument placeholder, which no test covers. There is no Architecture section: the fix adds an internal `metavar` setting to pylint's option plumbing and changes one option, so the visible effect is a behaviour change, which already appears under "What the PR does".

Files: [pr.diff](pr.diff) · [.verify/review-packet.md](.verify/review-packet.md) · [review.html](review.html)
