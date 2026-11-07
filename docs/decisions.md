# Decisions

One entry per real choice. Newest first. These are handy when writing the pitch ("we chose X because...").

<!-- Copy this block for each new decision:

## YYYY-MM-DD: <what we decided>

- **Chose:**
- **Over:**
- **Because:**
- **Revisit if:**

-->

## 2026-11-07: The engineer approves the tests only, not the architecture

- **Chose:** one human gate in the verification-first harness: the test and verification plan. The agent chooses the code and architecture itself and records them as design notes in the verification report.
- **Over:** a second gate where the engineer approves the architecture before the agent builds.
- **Because:** it fits the core belief that code is a black box. The engineer's attention goes on what "done" means and how it's proven; anything they care about in how it's built (performance, dependencies, reuse) goes into the plan as a check.
- **Revisit if:** agents keep producing designs the team rejects in review even when every check passes.
