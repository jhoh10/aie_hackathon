import type { ReviewPacket } from './reviewer';
export type Example = { id: string; source: string; caption: string; claimsProven: string | null; packet: ReviewPacket };
export const EXAMPLES: Example[] = [
  {
    "id": "pylint-8898",
    "source": "Developer harness, 11 approved checks",
    "caption": "3 untested behaviours, including commas inside `( )`: the change that failed the project's real hidden test",
    "packet": {
      "title": "Fix bad-names-rgxs mangling regular expressions with commas (pylint issue 8822)",
      "summary": "Regex-list options stop splitting on commas that belong to a regular expression.",
      "metrics": "Claims proven 11/11 (author's report) · Tests 5 new, 1 changed · Untested behaviours 3",
      "behaviors": [
        {
          "id": "F1",
          "text": "Comma in `{m,n}` split the regex → kept whole",
          "detail": "T1, T5",
          "untested": false,
          "changed": false
        },
        {
          "id": "F2",
          "text": "Comma in `[...]` split the regex → kept whole",
          "detail": "T2",
          "untested": false,
          "changed": false
        },
        {
          "id": "F3",
          "text": "Invalid-regex error showed fragment → shows full pattern",
          "detail": "T6",
          "untested": false,
          "changed": false
        },
        {
          "id": "F4",
          "text": "Comma inside `(...)`, e.g. `(a,b)`, split → kept whole",
          "detail": "**No test**",
          "untested": true,
          "changed": false
        },
        {
          "id": "F5",
          "text": "Backslash-escaped comma `\\,` split → kept in pattern",
          "detail": "**No test**",
          "untested": true,
          "changed": false
        },
        {
          "id": "F6",
          "text": "Unclosed `(` or `[` now swallows later commas into one pattern",
          "detail": "**No test**",
          "untested": true,
          "changed": false
        }
      ],
      "tests": [
        {
          "id": "T1",
          "text": "`(foo{1,3})` · `(foo{1,3}),bar` · `a{1,2},b{2,3}`",
          "detail": "`(foo{1,3})` · `(foo{1,3})`, `bar` · `a{1,2}`, `b{2,3}`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T2",
          "text": "`[a,b],c`",
          "detail": "`[a,b]`, `c`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T3",
          "text": "`foo,bar` · `foo, bar` · `foo,bar,` · empty string",
          "detail": "`foo`, `bar` (same for first three) · no patterns",
          "untested": false,
          "changed": false
        },
        {
          "id": "T4",
          "text": "`(foo` · already-compiled list",
          "detail": "ArgumentTypeError · list returned unchanged",
          "untested": false,
          "changed": false
        },
        {
          "id": "T5",
          "text": "`--bad-names-rgxs=(foo{1,3})` on CLI · same in pyproject.toml",
          "detail": "one pattern `(foo{1,3})`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T6",
          "text": "`--bad-names-rgx=(foo{1,3}`",
          "detail": "error names `(foo{1,3}` (changed; was `(foo{1,3})` crashing with `(foo{1`)",
          "untested": false,
          "changed": true,
          "oldExpectation": "`(foo{1,3})` crashing with `(foo{1`"
        }
      ],
      "architecture": []
    },
    "claimsProven": "11/11 (author's report)"
  },
  {
    "id": "sympy-24661",
    "source": "Developer harness, 7 approved claims",
    "caption": "A clean change: 3 behaviour lines, all tested, nothing flagged. The shortest kind of packet",
    "packet": {
      "title": "Respect evaluate=False for comparisons in parse_expr (sympy issue 24288)",
      "summary": "parse_expr(evaluate=False) now keeps comparisons unevaluated instead of returning True/False.",
      "metrics": "Claims proven 7/7 (author's report) · Tests 1 new, 0 changed · Untested behaviours 0",
      "behaviors": [
        {
          "id": "F1",
          "text": "`1 < 2` etc.: True/False → unevaluated relational",
          "detail": "T1",
          "untested": false,
          "changed": false
        },
        {
          "id": "F2",
          "text": "Operands inside comparisons: evaluated → unevaluated",
          "detail": "T2",
          "untested": false,
          "changed": false
        },
        {
          "id": "F3",
          "text": "Chained or `&`-joined comparisons: bool → unevaluated And",
          "detail": "T3, T4",
          "untested": false,
          "changed": false
        }
      ],
      "tests": [
        {
          "id": "T1",
          "text": "`1<2` · `1>2` · `1<=2` · `1>=2` · `1==2` · `1!=2` (evaluate=False)",
          "detail": "Lt/Gt/Le/Ge/Eq/Ne with args (1, 2), unevaluated",
          "untested": false,
          "changed": false
        },
        {
          "id": "T2",
          "text": "`x < y` · `x + 1 > y` (evaluate=False)",
          "detail": "Unevaluated Lt / Gt, with unevaluated Add",
          "untested": false,
          "changed": false
        },
        {
          "id": "T3",
          "text": "`(1 < 2) & (3 > 2)` (evaluate=False)",
          "detail": "Unevaluated And of unevaluated Lt, Gt",
          "untested": false,
          "changed": false
        },
        {
          "id": "T4",
          "text": "`1 < 2 < 3` (evaluate=False)",
          "detail": "Unevaluated And(Lt(1,2), Lt(2,3)), not True",
          "untested": false,
          "changed": false
        },
        {
          "id": "T5",
          "text": "`1 < 2` · `x < y` (default)",
          "detail": "`S.true` · `Lt(x, y)` (unchanged)",
          "untested": false,
          "changed": false
        }
      ],
      "architecture": []
    },
    "claimsProven": "7/7 (author's report)"
  },
  {
    "id": "pylint-8898-default-agent",
    "source": "Default agent, no plan",
    "caption": "No approved claims. The agent deliberately tested `(a,b)` staying whole, so the reviewer sees the design choice as a tested behaviour and can still object. One untested edge case",
    "packet": {
      "title": "Fix bad-names-rgxs mangling regular expressions with commas (pylint issue 8822)",
      "summary": "Stops regex lists splitting on commas inside braces, brackets, groups or after backslashes.",
      "metrics": "No approved claims · Tests 4 new, 1 changed · Untested behaviours 1",
      "behaviors": [
        {
          "id": "F1",
          "text": "`{1,3}` comma split pattern → kept whole",
          "detail": "T1",
          "untested": false,
          "changed": false
        },
        {
          "id": "F2",
          "text": "Comma in `[]`, `()` or after `\\` split → kept",
          "detail": "T2, T3, T4",
          "untested": false,
          "changed": false
        },
        {
          "id": "F3",
          "text": "Unterminated pattern error shows split fragment → full pattern",
          "detail": "T5",
          "untested": false,
          "changed": false
        },
        {
          "id": "F4",
          "text": "Unclosed `{`, `[` or `(`: later commas split → not split",
          "detail": "**No test**",
          "untested": true,
          "changed": false
        }
      ],
      "tests": [
        {
          "id": "T1",
          "text": "`--bad-names-rgx=(foo{1,3})`",
          "detail": "one pattern `(foo{1,3})`, no error",
          "untested": false,
          "changed": false
        },
        {
          "id": "T2",
          "text": "`[a,b]` · `[a,b]x,foo` · `(a,b)` · `(a,(b,c)),d` · `a\\,b,c` (splitter)",
          "detail": "`[a,b]` · `[a,b]x`, `foo` · `(a,b)` · `(a,(b,c))`, `d` · `a\\,b`, `c`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T3",
          "text": "`--bad-names-rgx=[a,b]`",
          "detail": "one pattern `[a,b]`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T4",
          "text": "`--bad-names-rgx=(a,b)`",
          "detail": "one pattern `(a,b)`",
          "untested": false,
          "changed": false
        },
        {
          "id": "T5",
          "text": "`--bad-names-rgx=(foo{1,3}`",
          "detail": "error names `(foo{1,3}` (changed; was `(foo{1`)",
          "untested": false,
          "changed": true,
          "oldExpectation": "`(foo{1`"
        }
      ],
      "architecture": []
    },
    "claimsProven": null
  },
  {
    "id": "pylint-6386-upstream",
    "source": "pylint's own maintainers (the real fix)",
    "caption": "`-v` no longer expects an argument. The help-text change has no test",
    "packet": {
      "title": "Fix the short verbose option -v expecting an argument (pylint issue 6386)",
      "summary": "Makes the short `-v` flag enable verbose mode without needing an argument.",
      "metrics": "No approved claims · Tests 1 new, 0 changed · Untested behaviours 1",
      "behaviors": [
        {
          "id": "F1",
          "text": "`-v` expects an argument → enables verbose mode",
          "detail": "T1",
          "untested": false,
          "changed": false
        },
        {
          "id": "F2",
          "text": "Help for `--verbose`, `--enable-all-extensions` shows argument placeholder → none",
          "detail": "**No test**",
          "untested": true,
          "changed": false
        }
      ],
      "tests": [
        {
          "id": "T1",
          "text": "Run on empty module with `-v`",
          "detail": "stderr contains \"Using config file\"",
          "untested": false,
          "changed": false
        }
      ],
      "architecture": []
    },
    "claimsProven": null
  }
];
