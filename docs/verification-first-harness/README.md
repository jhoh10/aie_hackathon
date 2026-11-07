# Verification-first harness

Expands **Idea 1** from [../ideas.md](../ideas.md): talk through the tests before writing the code.

A harness for coding agents (Claude Code or similar) that changes the order of work. Before any code is written, the agent and the engineer agree on **what "done" looks like and how it will be proven**. Then the agent builds until every agreed check passes.

## The one-line pitch

> The engineer approves the tests, not the code. The agent isn't finished until the approved tests pass.

## Core beliefs

1. **Code is a black box.** Nobody, author or reviewer, needs to read every line. Spend that attention on inputs, outputs and how they're verified.
2. **The test plan is the spec.** A plain-language table of checks is easier to agree on than prose requirements, and it can be run.
3. **Humans decide at gates, agents do the loops.** The engineer signs off twice: on the test plan and on the architecture. Everything else is the agent iterating against that plan.
4. **Every kind of evidence counts.** "Tests" means more than unit tests: e2e flows, screenshots, accessibility, performance budgets, security checks, LLM evals. See [testing-catalog.md](testing-catalog.md).
5. **Proof, not claims.** The agent finishes with a report of what ran and what passed, not "I implemented X".

## How a session runs

Five phases, with two human gates. Each phase is described in [conversation.md](conversation.md).

```
 A. Discuss the idea ──► B. Read the code, ask about testing ──► C. Draft the test plan
                                                                       │
            ┌──────────────────────── edit ◄───────────────────────────┤
            ▼                                                          ▼
 D. Confirm the plan (GATE 1: tests) ──► architecture (GATE 2) ──► E. Implement + loop until green
                                                                       │
                                                                       ▼
                                                              Verification report
```

| Phase | Who leads | Output |
| --- | --- | --- |
| A. Discuss the idea | Engineer | Task brief: goal, inputs, outputs, out of scope |
| B. Read the code, ask about testing | Agent | Codebase findings + testing questions |
| C. Expand the testing approach | Agent | Draft test plan (table, no code) |
| D. Confirm with the engineer | Engineer | Approved test plan + approved architecture |
| E. Implement and verify | Agent | Code, tests, all green, verification report |

## Files in this folder

| File | What's in it |
| --- | --- |
| [conversation.md](conversation.md) | The five phases in detail: goals, agent behaviour, questions, exit criteria, example dialogue |
| [testing-catalog.md](testing-catalog.md) | Every kind of check the agent can propose, what each proves and when to suggest it |
| [test-plan-template.md](test-plan-template.md) | The artifacts: task brief, test plan table, architecture map, verification report |

## Proposed answers to the open questions in ideas.md

These are a starting point for the team to argue with, not decisions yet.

- **What does the conversation produce?** Three things, in order: a plain-language test plan (the table the engineer approves), real test files generated from it, and a verification report at the end. The test plan is the source of truth; the test files are derived from it.
- **Where does it happen?** In the coding agent's CLI first (Claude Code), since that's where the engineer already is. The plan is saved as a markdown file in the repo (`.verify/plan.md`) so it travels with the PR.
- **How does a reviewer use it?** The PR description carries the approved test plan and the verification report. The reviewer checks that the plan covers the change and that each row passed, instead of reading the diff line by line.
- **What's the demo moment?** The agent pauses with a six-row table and two buttons, *Approve plan* / *Edit tests*. The engineer edits one row live (for example adds a mobile screenshot test). The agent builds, one test fails, the agent fixes it, and the final report shows every row green with screenshots attached.

## Hackathon scope

What we'd build, smallest first:

1. **Must:** a system prompt / skill that makes Claude Code follow phases A–E, write `.verify/plan.md`, and refuse to implement before Gate 1.
2. **Should:** a runner that maps each plan row to a test command and produces the verification report.
3. **Could:** a small web view of the plan with approve/edit buttons and the report with screenshots.
4. **Could:** a reviewer mode that checks an existing PR against its `.verify/plan.md`.

## Still open

- How strict is Gate 1? Can the engineer say "skip, just build"?
- What happens when a test in the plan turns out to be impossible to write? (Proposal: the agent stops and asks; it never silently drops a row.)
- How do we stop the agent from weakening a test to make it pass? (Proposal: approved test files are locked; changing one needs a new approval. See conversation.md, phase E.)
