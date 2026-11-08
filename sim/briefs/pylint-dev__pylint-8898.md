I want regular expressions like `foo{1,3}` to work in regex list options. A comma inside a quantifier's braces `{...}` belongs to the regex and must not split it.

Nothing else about splitting should change. A comma anywhere else, including inside `( )` or `[ ]`, still separates two patterns, exactly as today, because existing configs rely on that. So `(foo{1,3})` is one pattern, but `(a,b)` is still two pieces, `(a` and `b)`.

Whitespace around each pattern is stripped, as today. If a piece is not a valid regex after splitting, the error names that piece, as today.
