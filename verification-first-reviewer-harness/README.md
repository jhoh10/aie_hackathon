# Verification-first reviewer harness

The other half of the [developer harness](../verification-first-developer-harness/README.md). The developer harness gets the engineer and the agent to agree on claims before code is written. The reviewer harness lets a reviewer judge the finished pull request **without reading the raw diff**.

## The one-line pitch

> Review the change, not the code. The reviewer reads one short page: what the PR now does, what its tests feed in and expect out, and, only when it changed, the architecture. Then they approve or critique that page.

## Core beliefs

1. **Code is a black box for the reviewer too.** Reading every line doesn't scale to agent-written code. A reviewer's attention goes on behaviour, evidence and structure.
2. **The summary is generated from the diff, not from the author's description.** The PR description and the claims say what was *meant*. The packet says what the code *does*. Any gap between the two is the most important thing on the page.
3. **Short beats complete.** The whole packet is about 200 words: at most 3 lines on what the PR does, plus one line for every behaviour no test covers. Those lines are the point of the packet.
4. **Nothing in the diff goes unexplained.** Every behaviour change shows up in what the PR does. A behaviour change with no test always gets its own line, marked **No test**.
5. **Critique is about behaviour.** The reviewer comments on packet items ("F2 is not wanted", "T4 needs an empty-input case"). Those comments go back to the developer agent as edits to the claims, not as line comments.

## What it adds over what we already have

| Already there | What it answers | Reviewer harness adds |
| --- | --- | --- |
| Claims review page ([ui/plan-review.html](../verification-first-developer-harness/ui/plan-review.html)) | *Before* building: are these the right claims? | *After* building: what does the code actually do, and is that only what the claims allowed? |
| Verifier verdict, PASS / BLOCK / NEEDS_HUMAN ([verifier/](../verifier/)) | Is each approved claim proven? | Is there behaviour that **no claim covers**? Changed or weakened existing tests? Architecture drift? |
| Developer harness report (`.verify/report.md`) | The author's own account of what passed | An independent summary built from the diff, cross-checked against that report |

Example: in one of our pylint evaluation runs, all 11 approved checks passed and the author's report said so. But the code also stopped splitting regexes on commas inside `( )`, and no check covered that. It is exactly what failed the project's real hidden test. A verifier that proves only the approved claims won't flag it. The review packet marked it **No test**, generated in under a minute for about $0.20. See [examples/pylint-8898/](examples/pylint-8898/).

## How a review runs

```
 PR diff + .verify/ (claims, report) + verifier verdict
                     │
                     ▼
 1. Gather ──► 2. Summarize ──► 3. Check ──► 4. Present the packet
                                    │                  │
                       untested behaviour gets its     ▼
                       own "No test" line
                                                5. Reviewer: Approve / Request changes / Comment
                                                           │
                                                           ▼
                                  6. Feedback to the developer agent as claim edits
```

The steps are described in [review-flow.md](review-flow.md).

## The review packet

A header and up to three short sections, everything numbered so the reviewer can point at it. Only "What the PR does" is always there; the other sections appear only when they have something to say. The full template is in [review-packet-template.md](review-packet-template.md).

| Section | What the reviewer sees |
| --- | --- |
| **Header** | One sentence (at most 15 words); claims proven, tests new / changed, untested behaviours |
| **What the PR does** (F1, F2, …) | At most 3 one-line behaviour changes (before → after, at most 10 words) with the tests that cover them, plus one line per behaviour with **No test** |
| **Tests** (T1, T2, …), if the PR touches tests | At most 6 rows of input → expected output, similar cases grouped; changed existing tests say what they used to expect |
| **Architecture** (A1, A2, …), only for high-level changes | At most 3 lines: components added or removed, public API, CLI, config, dependency, schema or data format changes, new connections between components. Private helpers and internal refactors never count, so a bug fix usually has no architecture section |

## Files in this folder

| File | What's in it |
| --- | --- |
| [review-prompt.md](review-prompt.md) | **The prompt to use**: makes a coding agent produce the review packet for a PR |
| [review-flow.md](review-flow.md) | The six steps, the self-checks that keep the packet honest, and how critique flows back |
| [review-packet-template.md](review-packet-template.md) | The packet format the prompt fills in |
| [ui/render.py](ui/render.py) | Turns a packet (and the PR diff) into the page the reviewer uses: untested behaviour highlighted, architecture file references open their diff lines, comments on items, Approve / Request changes, export as `review.md` |
| [examples/pylint-8898/](examples/pylint-8898/) | A real packet generated from one of our SWE-bench runs, and its rendered page `review.html` |

## Running it

From the root of the repository the PR is in, with its branch checked out:

```bash
claude -p "Write the review packet for this branch against main." \
  --append-system-prompt "$(cat path/to/verification-first-reviewer-harness/review-prompt.md)" \
  --allowedTools "Read" "Grep" "Glob" "Write" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)"
```

It writes `.verify/review-packet.md`. To get the reviewer's page:

```bash
python3 path/to/verification-first-reviewer-harness/ui/render.py .verify/review-packet.md --diff <(git diff main...HEAD) -o .verify/review.html
```

The page exports the reviewer's decision as `.verify/review.md` (format in the template). Open it over http rather than as a local file if your viewer blocks scripts in local files.

## Still open

- Show the packet on the verifier's PR page, next to the verdict, instead of as a markdown file.
- Measure it: time to a review decision, and how often a **No test** line catches a real problem, compared with reviewing the raw diff (simulated reviewer, as in verifier/docs/metrics.md).
- How large a PR can one packet cover before it needs grouping (the same question as [display-scaling.md](../verification-first-developer-harness/display-scaling.md))?
