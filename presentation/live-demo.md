# Live demo runbook

Instructions for Claude Code. To run the demo, open Claude Code at the repo root and say:

> Run presentation/live-demo.md

The demo has two acts, and each act ends on a page in the browser pane:

1. **Developer harness.** The default Claude Code harness and the verification-first developer harness both work live on the same SWE-bench task. The output is a side-by-side page.
2. **Reviewer harness.** The verification-first reviewer harness turns a PR into a review packet live. The output is the reviewer's page.

Total time is about 6–8 minutes, and the model cost is about $1.50.

---

## Instructions for Claude

You are running a live demo in front of an audience. Follow these steps in order. While anything runs, post a one-line update every 30–60 seconds that says what is happening, for example "Side C wrote its test plan; the simulated engineer is reviewing it". Keep each line short. The audience reads them.

Rules:
- Never commit or push anything this demo creates. Live outputs go to `sim/out/<task>/live/`, which is git-ignored.
- Do not edit any file in the repo, including `sim/`, the harness prompts and the renderer. If a step fails, follow its **Fallback** line and keep going.
- Run long commands in the background and watch their output, so you can narrate while they run.

### Settings

| Name | Value |
| --- | --- |
| `REPO` | the repo root (this file is `presentation/live-demo.md` in it) |
| `W` | `$HOME/trust-issues-demo`: outside the repo, with no spaces in the path |
| `TASK` | `pylint-dev__pylint-8898` (the comma-in-regex bug; `sim/tasks/pylint-dev__pylint-8898.json`) |
| `BASE` | `1f8c4d9eb185c16a2c1d881c054f015e1c2eb334` (the task's base commit) |
| `FALLBACK` | `sim/out/pylint-dev__pylint-8898/run1`, a recorded run with the same setup |

### Step 0: Preflight (silent, under a minute)

Check these and fix anything missing. Report only one line, "Preflight OK", or say what you fixed.
1. `claude` and `uv` are on the PATH, and `claude -p "say ok" --model claude-haiku-5-5` answers. If Claude Code isn't signed in, stop and ask the presenter to sign in.
2. `sim/work/pylint-base` exists. If it doesn't, clone it: `git clone --filter=blob:none https://github.com/pylint-dev/pylint.git sim/work/pylint-base`.
3. `$W/$TASK/.venv/bin/python` exists. If it doesn't, create it with the `uv venv` and `uv pip install` commands for this task in [sim/README.md](../sim/README.md), using `$W` as the workdir.
4. Clear any earlier live run. Remove `sim/out/$TASK/live/`, `$W/$TASK/live/` and `$W/review-pr`, then run `git -C sim/work/pylint-base worktree prune`.

### Step 1: Act 1, default vs verification-first developer harness

Tell the audience in 2–3 lines:
- **The task:** pylint's `bad-names-rgxs` option splits regular expressions on commas, which breaks patterns like `(foo{1,3})`.
- **Side A** is Claude Code with its default behaviour. **Side C** is our verification-first developer harness ([harness-prompt.md](../verification-first-developer-harness/harness-prompt.md)). Both get the same issue, the same model and tools, and the same simulated engineer. Neither sees the hidden tests.

Start both sides in parallel, each as its own background command, with the second started about 5 seconds after the first so the two `git worktree add` calls don't collide:

```bash
python3 sim/run.py sim/tasks/pylint-dev__pylint-8898.json --workdir "$W" --sides a --run live
python3 sim/run.py sim/tasks/pylint-dev__pylint-8898.json --workdir "$W" --sides c --run live
```

While they run, narrate from `sim/out/$TASK/live/side_a/transcript.jsonl` and `side_c/transcript.jsonl`, and read new lines as they appear. Things worth calling out:
- Side A starts editing code straight away.
- Side C looks around silently. Then it writes `.verify/plan.md` with its claims and the regression scope, and runs the baseline before it builds.
- The engineer approves the plan, which is the one human approval.
- Side C ends with a 4-line final message.

When a side's `.verify/plan.md` appears in its checkout (`$W/$TASK/live/side_c/.verify/plan.md`), show the claims table in chat.

When both commands finish, build the page:

```bash
python3 sim/viewer.py pylint-dev__pylint-8898/live
```

Then show the page. Copy `sim/out/$TASK/live/compare.html` into `$W/pages/compare.html`. Serve `$W/pages` with `python3 -m http.server 4620 --bind 127.0.0.1 --directory "$W/pages"` in the background (start it only once). Open `http://127.0.0.1:4620/compare.html` in the browser pane.

Sum up in at most 4 lines from the two `score.json` files and the scoreboard:
- whether each side resolved the hidden tests;
- cost and time for each side;
- how many words the engineer had to read on each side;
- that Side C wrote its tests before it wrote code.

Say plainly what happened, even if Side C lost on this run. Our recorded result over 3 runs per side: C averaged $0.42 and 1.3 min, against A's $0.74. The hidden test rewards one specific design, so most runs on both sides fail it.

**Fallback:** if a side errors out or runs past 8 minutes, stop it. Then open the recorded run's page, `$FALLBACK/compare.html` (copy it into `$W/pages`), say it's the recorded run, and continue with Act 2.

### Step 2: Act 2, verification-first reviewer harness

Tell the audience in 2 lines: the reviewer never reads the raw diff. They get a packet that lists what the PR does, the tests as inputs and outputs, and architecture only when it changed at a high level. Every behaviour with no test is flagged **No test**.

**The PR** is Side C's change from Act 1. If Act 1 used the fallback, or Side C produced no change, use `$FALLBACK/side_c` instead and say so. The PR's files are `model.patch`, `plan.md` and `report.md` in `sim/out/$TASK/live/side_c/`.

Build a branch for the PR from the task's base commit:

```bash
git -C sim/work/pylint-base worktree add -B demo-base "$W/review-pr" 1f8c4d9eb185c16a2c1d881c054f015e1c2eb334
cd "$W/review-pr" && git switch -c demo-pr
git apply "<PR dir>/model.patch"
git add -A && git commit -qm "Fix bad-names-rgxs splitting regexes on commas"
mkdir -p .verify && cp "<PR dir>/plan.md" "<PR dir>/report.md" .verify/
```

Leave `.verify/` uncommitted: it holds the approved plan and the author's report, which the reviewer prompt reads as inputs.

Write the packet live. Run this in the background from `$W/review-pr`, with `REPO` as the absolute repo path:

```bash
claude -p "Write the review packet for this branch against demo-base." \
  --model claude-sonnet-5-5 \
  --append-system-prompt "$(cat "$REPO/verification-first-reviewer-harness/review-prompt.md")" \
  --allowedTools "Read" "Grep" "Glob" "Write" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(git status:*)"
```

When `.verify/review-packet.md` appears, show it in chat. Then render the reviewer's page and open it:

```bash
python3 "$REPO/verification-first-reviewer-harness/ui/render.py" .verify/review-packet.md --diff <(git diff demo-base...demo-pr) -o "$W/pages/review.html"
```

Open `http://127.0.0.1:4620/review.html` in the browser pane. Point out:
- the header line, with the claims proven and the untested count;
- each **No test** row, which is a behaviour the PR changes without any test exercising it. On this task, comma-inside-`()` (`(a,b)`) is the usual one, and it is exactly what the hidden test checks.
- that the Architecture section is missing because nothing changed at a high level;
- that a comment on a row turns into a new claim, and the decision exports as `review.md`.

**Fallback:** if the packet run fails, open the recorded example instead: copy `verification-first-reviewer-harness/examples/pylint-8898/review.html` into `$W/pages/` and open it. Say that it's the recorded packet for the same task.

### Step 3: Close

End with three lines:
1. **Developer harness:** the tests are agreed before the code, and the run costs less than the default.
2. **Reviewer harness:** review the behaviour and the tests, not the diff, and untested changes stand out.
3. **Where everything is:** `verification-first-developer-harness/`, `verification-first-reviewer-harness/`, `sim/`.

Leave the server running and the pages open for questions. When the presenter says the demo is over, stop the server and remove the review worktree: `git -C sim/work/pylint-base worktree remove --force "$W/review-pr"`.

---

## Before the talk (for the presenter)

- Do a full dry run once on the demo machine, ideally the day before. It creates the Python env, warms the clone, and catches sign-in or permission prompts.
- Run in a Claude Code session that allows `python3`, `git` and `claude` commands without asking, or approve them during the dry run, so no prompt interrupts the live demo.
- The demo needs network access, for the model and for git to fetch pylint's blobs.
