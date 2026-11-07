# Side-by-side harness simulation

Runs one SWE-bench Verified task with different agent harnesses, the same model and tools, and a simulated engineer, then scores each side with the task's hidden tests and builds a side-by-side page. The results are in [verification-first-developer-harness/evaluation/](../verification-first-developer-harness/evaluation/) and in `out/` here.

| Side | Harness |
| --- | --- |
| A | Claude Code, default behaviour |
| B | Verification-first harness, first version ([harness_b.md](harness_b.md)) |
| C | Lean verification-first harness ([harness_c_lean.md](harness_c_lean.md), v2). This became the default in [harness-prompt.md](../verification-first-developer-harness/harness-prompt.md); v1 is kept as `harness_c_lean_v1.md` |

## How a run works

1. Each side gets its own checkout of the task's repo at the task's base commit, outside this repo (so this repo's `CLAUDE.md` can't leak in), and the same issue text.
2. The agent runs headless (`claude -p`) with the same allowed tools on every side. Web access and `git log` are off, so it can't look up the real fix.
3. After each turn, a **simulated engineer** (a second Claude that knows only the issue text) answers questions, approves or edits the plan, and replies `DONE` when the work is finished.
4. **Scoring:** apply the side's change, reset the test files the hidden tests touch, apply the official test patch, and run the `FAIL_TO_PASS` and `PASS_TO_PASS` tests. The real upstream fix scores as resolved and an empty change doesn't, for both tasks we used.

## Running it

Needs Claude Code signed in (`claude` on your PATH, or set `CLAUDE_BIN`), `git`, and [uv](https://docs.astral.sh/uv/). Pick a scratch folder **outside this repo, with no spaces in its path** (Claude Code's permission rules don't match paths with spaces):

```bash
W=/tmp/simwork
```

One-time setup per task: clone the repo and make its Python env. For `pylint-dev__pylint-8898`:

```bash
git clone --filter=blob:none https://github.com/pylint-dev/pylint.git sim/work/pylint-base
uv venv --python 3.11 $W/pylint-dev__pylint-8898/.venv
uv pip install --python $W/pylint-dev__pylint-8898/.venv/bin/python "astroid==3.0.0a8" dill platformdirs "isort<6" "mccabe<0.8" tomlkit "typing-extensions~=4.7" "pytest~=7.4" pytest-timeout pytest-benchmark py requests
```

For `sympy__sympy-24661`, clone sympy to `sim/work/sympy-base` and install `mpmath==1.3.0 pytest` into `$W/sympy__sympy-24661/.venv`.

Run, score and view:

```bash
python3 sim/run.py sim/tasks/pylint-dev__pylint-8898.json --workdir $W --sides abc
python3 sim/viewer.py pylint-dev__pylint-8898
```

Repeat runs and average them:

```bash
for r in run1 run2 run3; do python3 sim/run.py sim/tasks/pylint-dev__pylint-8898.json --workdir $W --sides abc --run $r; done
python3 sim/summary.py pylint-dev__pylint-8898
```

Pages land in `out/<task>/compare.html` (one run) and `out/<task>/summary.html` (averages, linking each run's page).

## Files

| File | What it does |
| --- | --- |
| [run.py](run.py) | Runs the sides, the simulated engineer and the scoring |
| [viewer.py](viewer.py) | Builds the side-by-side page for one run |
| [summary.py](summary.py) | Averages repeated runs into one page |
| [tasks/](tasks/) | The SWE-bench Verified task records we used |
| `out/` | Transcripts, patches, plans, reports, scores and pages from our runs |
| `work/` | Repo clones (git-ignored) |

## What we found

- **sympy-24661:** both sides resolved it. The model had probably seen the task during training.
- **pylint-8898, 3 runs per side:** the lean harness (C) cost $0.42 against $0.88 for B and $0.74 for A. It took half the time, and the engineer read half as many words. The hidden test rewards one specific design, so 8 of 9 runs failed it on every side; pass rate doesn't separate the harnesses there. See `docs/log.md` and `docs/decisions.md`.
