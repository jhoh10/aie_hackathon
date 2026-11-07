# Verification-first harness

Expands **Idea 1** from [docs/ideas.md](../docs/ideas.md): talk through the tests before writing the code.

A harness for coding agents (Claude Code or similar) that changes the order of work. Before any code is written, the agent and the engineer agree on **what "done" looks like and how it will be proven**. Then the agent builds until every agreed check passes.

## The one-line pitch

> The engineer approves the claims, not the code. The agent isn't finished until every claim is proven.

## Core beliefs

1. **Code is a black box.** Nobody, author or reviewer, needs to read every line. Spend that attention on inputs, outputs and how they're verified.
2. **The claims are the spec.** A claim is one behaviour that must be true, written in plain language ("a reset link works only once"). A list of claims is easier to agree on than prose requirements, and each one can be checked.
3. **The engineer owns the claims; the agent owns the code.** The engineer signs off once, on the plan: the claims and the checks that will prove them. The agent chooses the code and architecture it thinks are best, and iterates until the plan passes.
4. **Every kind of evidence counts.** The checks under a claim are more than unit tests: e2e flows, screenshots, accessibility, performance budgets, security checks, LLM evals. See [testing-catalog.md](testing-catalog.md).
5. **Proof, not claims.** The agent finishes with a report of what ran and what passed, not "I implemented X".
6. **Lean by default.** One message to read and one approval to give. At most 8 claims, a fixed set of regression tests checked once before and once after, and a 4-line final message. Verification shouldn't double the cost of a change. See [harness-prompt.md](harness-prompt.md).

## How a session runs

Five phases, with one human gate: the plan (claims, plus the checks that prove them). Each phase is described in [conversation.md](conversation.md).

```
 A. Discuss the idea ──► B. Read the code, ask about testing ──► C. Draft claims + checks ◄─┐
                                                                         │                  │ edit
                                                                         ▼                  │
                                                       D. Confirm the plan (THE GATE) ──────┘
                                                                         │ approved
                                                                         ▼
                                              E. Agent picks the design, builds, loops until green
                                                                         │
                                                                         ▼
                                                     Verification report (with design notes)
```

| Phase | Who leads | Output |
| --- | --- | --- |
| A. Discuss the idea | Engineer | Task brief: goal, inputs, outputs, out of scope |
| B. Read the code, ask about testing | Agent | Codebase findings + testing questions |
| C. Expand the testing approach | Agent | Draft plan: claims, each with its checks (no code) |
| D. Confirm with the engineer | Engineer | Approved claims |
| E. Implement and verify | Agent | Its own design choices, code, tests, all green, verification report |

## Files in this folder

| File | What's in it |
| --- | --- |
| [harness-prompt.md](harness-prompt.md) | **The prompt to use**: the lean system prompt that makes a coding agent follow the harness |
| [conversation.md](conversation.md) | The five phases in detail, and the lean rules that are the default |
| [evaluation/](evaluation/) | Side-by-side runs of the default agent vs the harness on SWE-bench tasks |
| [testing-catalog.md](testing-catalog.md) | Every kind of check the agent can propose, what each proves and when to suggest it |
| [test-plan-template.md](test-plan-template.md) | The artifacts: task brief, plan (claims and checks), design notes, verification report |
| [display-scaling.md](display-scaling.md) | How the plan and report show a one-line bug fix and a whole feature on the same screen |

## End to end: harness plan → verifier → verdict

One command takes an approved harness plan, turns its Claims table into the verifier's claims JSON ([claims contract](../verifier/docs/claims-contract.md)), and runs the verifier on the old and new commits in Docker. Needs Docker and Node 23+. Run it from `verifier/`:

```bash
git clone https://github.com/pocketbase/pocketbase .work/repos/pocketbase   # once
node --no-warnings src/handoff.ts ../verification-first-harness/examples/h-bearer/.verify/plan.md --case h-bearer
```

- **Input:** [examples/h-bearer/.verify/plan.md](examples/h-bearer/.verify/plan.md), the plan the harness writes in phase C and the engineer approves in phase D (PocketBase: accept the `Bearer` prefix in any letter case). Plans without `Status: APPROVED by ...` are refused.
- **Hand-off:** the Claims table becomes `.verify/claims.json` next to the plan. That file is all the verifier gets; no code and no notes.
- **Output:** each claim proven or not, with old and new HTTP status per check, probes on the diff, coverage of the changed lines, then `VERDICT PASS | BLOCK | NEEDS_HUMAN`. Exit code 0, 1 or 2. Full evidence goes to `verifier/.work/runs/handoff-h-bearer.json`.
- **Model:** with `MODEL_API_KEY` set, the verifier's model writes the checks. Without it, the checks come from hand-written answers in [examples/h-bearer/answers/](examples/h-bearer/answers/), standing in for the model until the Meta API works.
- **Time:** about 3 minutes the first time (two Go builds), about 75 seconds after that (each check runs twice on each version in a fresh container).

## Proposed answers to the open questions in ideas.md

These are a starting point for the team to argue with, not decisions yet.

- **What does the conversation produce?** Three things, in order: a plan of plain-language claims with the checks that prove each one (the engineer approves this), real test files generated from it, and a verification report at the end. The claims are the source of truth; the checks and test files are derived from them. The claims also go to the verifier as-is ([claims contract](../verifier/docs/claims-contract.md)).
- **Where does it happen?** In the coding agent's CLI first (Claude Code), since that's where the engineer already is. The plan is saved as a markdown file in the repo (`.verify/plan.md`) so it travels with the PR.
- **How does a reviewer use it?** The PR description carries the approved claims and the verification report. The reviewer checks that the claims cover the change and that each one is proven, instead of reading the diff line by line.
- **What's the demo moment?** The agent pauses with six claims and two buttons, *Approve claims* / *Edit*. The engineer edits one live (for example adds "the page works on mobile", which brings a screenshot check with it). The agent builds, one check fails, the agent fixes the code, and the final report shows every claim green with screenshots attached.

## Hackathon scope

What we'd build, smallest first:

1. **Must:** a system prompt / skill that makes Claude Code follow phases A–E, write `.verify/plan.md`, and refuse to implement before the claims are approved.
2. **Should:** a runner that maps each check to a test command and produces the verification report.
3. **Could:** a small web view of the plan with approve/edit buttons and the report with screenshots.
4. **Could:** a reviewer mode that checks an existing PR against its `.verify/plan.md`.

## Still open

- How strict is the gate? Can the engineer say "skip, just build"?
- What if the engineer dislikes the design the agent chose? (Proposal: they don't review the design directly. They add a check to the plan that captures what they actually care about, such as a performance budget or "no new dependencies", and the agent rebuilds against it.)
- What happens when a test in the plan turns out to be impossible to write? (Proposal: the agent stops and asks; it never silently drops a claim or a check.)
- How do we stop the agent from weakening a check to make it pass? (Proposal: approved test files are locked; changing one needs a new approval. See conversation.md, phase E.)
