# Ideas

**Direction:** trust but verify. This fits the hackathon's "verify what other agents ship before it merges" theme (see resources/event.md).

**Picked:** Idea 1 (2026-11-07, see docs/decisions.md).

## Idea 1: Talk through the tests before writing the code (picked)

Expanded in [verification-first-developer-harness/](../verification-first-developer-harness/README.md): the five-phase conversation, a catalog of every kind of test, and templates.

Get engineers into a conversation about testing *before* they start coding. Working out the inputs, outputs and how to verify them makes people understand what they're building before they build it.

- **Core belief:** treat the code as a black box. Nobody, author or reviewer, needs to understand every line. Spend that time on inputs, outputs and verification instead.
- **Who it's for:** engineers about to start a task.
- **Bonus:** reviewers can use the same conversation and its output to review the change against agreed inputs and outputs instead of reading line by line.
- **Open questions:**
  - What does the conversation produce: a test plan, real test files, an I/O spec?
  - Where does it happen: CLI, IDE, PR, chat?
  - How does a reviewer use it at review time?
  - What's the demo moment?

## Idea 2: The LLM picks the lines worth reviewing (not picked)

The LLM points reviewers at the significant lines of a change, so they review those instead of the whole diff.

- **Open questions:** what makes a line "significant"? How do we show the reviewer didn't miss something important?

## Scoring

Score 1–5 on each column; higher is better (for "Effort", 5 = easiest).

| Idea | Fits the theme | Effort | Wow | Total |
| --- | --- | --- | --- | --- |
| 1. Tests-first conversation | | | | |
| 2. LLM highlights lines to review | | | | |
