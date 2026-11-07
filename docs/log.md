# Log

Newest entries at the top. Keep each one short: what happened, who, and anything someone joining later would need to know.

## 2026-11-07

- **Harness: dropped the architecture approval** (DT). The engineer now approves only the test and verification plan; the agent picks the code and architecture itself and explains them in design notes in its report. See docs/decisions.md.
- **Idea 1 expanded** (DT) into verification-first-harness/ (repo root): a five-phase conversation (discuss → read code and ask → test plan → approve plan and architecture → build until green), a testing catalog covering unit to LLM evals, and templates for the brief, plan, architecture map and verification report. Proposed answers to idea 1's open questions are in its README.
- **Team name: Trust Issues.** Working pitch: "AI writes more code than anyone can read. We treat code as a black box: settle the inputs, outputs and tests up front, then verify the result against them." Now in the README.
- **Direction: trust but verify.** Two ideas on the table (docs/ideas.md). Leaning towards idea 1: a conversation about tests and inputs/outputs before any code is written, with code treated as a black box. Not final yet.
- **Resources folder added** (JH). Event summary in resources/event.md, sponsor API docs in resources/sponsors.md. The event details page needs a Cerebral Valley login; schedule, judging criteria and submission rules from it still need copying in.
- **Collaborators invited** (JH): Kolumba-ai, sosthoff, deepakiitgcse.
- **Repo created** (JH). Tracking docs in place: TASKS.md, docs/ideas.md, docs/decisions.md, docs/submission.md.
