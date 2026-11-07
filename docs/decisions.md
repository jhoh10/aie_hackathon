# Decisions

One entry per real choice. Newest first. These are handy when writing the pitch ("we chose X because...").

<!-- Copy this block for each new decision:

## YYYY-MM-DD: <what we decided>

- **Chose:**
- **Over:**
- **Because:**
- **Revisit if:**

-->

## 2026-11-07: Build idea 1, the verification-first harness

- **Chose:** Idea 1: talk through the tests before writing the code. The agent and the engineer agree on inputs, outputs and the test plan first, then the agent builds until the approved tests pass (verification-first-harness/).
- **Over:** Idea 2: the LLM picks the lines worth reviewing.
- **Because:** The team settled on it. It fits the "verification" theme directly and has already been worked out furthest (five-phase conversation, testing catalog, templates).
- **Revisit if:** The core loop (approved plan → build → green report) isn't working end to end by the 2:30 PM milestone.
