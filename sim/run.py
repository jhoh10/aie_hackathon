#!/usr/bin/env python3
"""Run one SWE-bench task with two harnesses side by side.

Side A: Claude Code with its default behaviour.
Side B: Claude Code with the verification-first harness (sim/harness_b.md).

Both sides get the same issue text, model, tools and simulated engineer.
The simulated engineer only knows the issue text; it never sees the hidden tests.

Usage:
  python3 sim/run.py sim/tasks/sympy__sympy-24661.json --workdir /some/dir/outside/this/repo
  python3 sim/run.py ... --sides b          # run only one side
  python3 sim/run.py ... --score-only        # re-score existing runs
"""
import argparse
import glob
import json
import os
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"


def base_repo(task):
    """Clone of the task's repo, e.g. sim/work/pylint-base."""
    return HERE / "work" / (task["repo"].split("/")[1] + "-base")


def task_py(task, args):
    """Python for agents and scoring: <workdir>/<instance>/.venv, else <workdir>/.venv. No spaces allowed."""
    for p in (Path(args.workdir) / task["instance_id"] / ".venv" / "bin" / "python",
              Path(args.workdir) / ".venv" / "bin" / "python"):
        if p.exists():
            if " " in str(p):
                raise SystemExit(f"Python path must not contain spaces: {p}")
            return str(p)
    raise SystemExit(f"No Python env found; create {Path(args.workdir) / task['instance_id'] / '.venv'} with the repo's test deps")

ENGINEER_PROMPT = """You are role-playing the software engineer who filed the GitHub issue below and asked a coding agent to resolve it. You know only what is in the issue (and general programming knowledge). You have not seen any hidden tests and must not invent requirements beyond what a reasonable maintainer would expect.

How to behave:
- Answer the agent's questions briefly and decisively, like a busy engineer.
- If the agent proposes a test or verification plan, review it. If it clearly misses something the issue implies, ask for that addition once; otherwise approve it.
- Don't write code and don't tell the agent how to implement it.
- If the agent asks permission to proceed, say yes.
- You cannot run commands or see the agent's machine. Never claim you ran anything or saw any output. If the agent says it is blocked, tell it to do its best and report what it could not verify.
- If the agent's latest message is a final report saying the work is finished and it asks nothing, reply with exactly: DONE

<issue>
{issue}
</issue>

<conversation_so_far>
{conversation}
</conversation_so_far>

Reply with only your next message to the agent (or DONE)."""

# With --brief, the engineer also knows what they want (their intent), as in
# verification-first-developer-harness/evaluation/pocketbase/. Same engineer on every side, and it only
# answers what it's asked or what a plan gets wrong, so only an agent that asks or shows a plan gets the intent.
ENGINEER_BRIEF_PROMPT = """You are role-playing the software engineer who filed the GitHub issue below and asked a coding agent to resolve it. You know what you want (your intent, below) but you have not read the code, and you don't want to.

How to behave:
- If the agent asks you questions, answer them from your intent, briefly, in terms of behaviour (inputs and outputs), not code.
- If it shows a plan or a list of checks, approve it ("Approved.") when it matches your intent. If something in it contradicts your intent, say what to change in one or two lines, and approve the rest.
- Only say what its message asks about or gets wrong. Don't volunteer the rest of your intent. A real engineer answers what they're asked; they don't recite a spec.
- Never mention files, functions, tests or code, and never mention that you were given an intent.
- You cannot run commands or see the agent's machine. Never claim you ran anything or saw any output.
- If the agent's latest message is a final report saying the work is finished and it asks nothing, reply with exactly: DONE

<issue>
{issue}
</issue>

<your_intent>
{brief}
</your_intent>

<conversation_so_far>
{conversation}
</conversation_so_far>

Reply with only your next message to the agent (or DONE)."""

USER_PROMPT = """Please resolve this GitHub issue in the repository in the current directory.

<issue>
{issue}
</issue>

Environment: run Python and tests with `{py}` (pytest is installed), e.g. `{py} -m pytest path/to/test_file.py -q`."""


def find_claude():
    if os.environ.get("CLAUDE_BIN"):
        return os.environ["CLAUDE_BIN"]
    hits = glob.glob(os.path.expanduser(
        "~/Library/Application Support/Claude/claude-code/*/*/claude.app/Contents/MacOS/claude"))
    if not hits:
        raise SystemExit("No Claude Code binary found; set CLAUDE_BIN")
    return sorted(hits, key=lambda p: [int(x) if x.isdigit() else x for x in p.split("/")[-5].split(".")])[-1]


def sh(cmd, cwd=None, check=True, **kw):
    return subprocess.run(cmd, cwd=cwd, check=check, text=True, capture_output=True, **kw)


def claude(args, cwd, log, tag, env=None):
    """Run one headless Claude Code turn, append its events to log, return the result event."""
    cmd = [find_claude(), "-p", *args, "--output-format", "stream-json", "--verbose"]
    t0 = time.time()
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, timeout=3600,
                       env={**os.environ, **(env or {})})
    events = []
    for line in p.stdout.splitlines():
        line = line.strip()
        if line.startswith("{"):
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    with open(log, "a") as f:
        for e in events:
            e["_tag"] = tag
            f.write(json.dumps(e) + "\n")
    result = next((e for e in reversed(events) if e.get("type") == "result"), None)
    if result is None:
        raise RuntimeError(f"No result from claude ({tag}). stderr:\n{p.stderr[-2000:]}")
    if result.get("is_error"):
        raise RuntimeError(f"claude error ({tag}): {result.get('result')}")
    result["_wall"] = time.time() - t0
    return result


def engineer(issue, convo, model, workdir, log, brief=None):
    edir = Path(workdir) / "engineer"
    edir.mkdir(parents=True, exist_ok=True)
    convo_text = "\n\n".join(f"[{who}]\n{text}" for who, text in convo)
    if brief:
        prompt = ENGINEER_BRIEF_PROMPT.format(issue=issue, brief=brief, conversation=convo_text)
    else:
        prompt = ENGINEER_PROMPT.format(issue=issue, conversation=convo_text)
    r = claude([prompt, "--model", model, "--disallowedTools",
                "Bash", "Edit", "Write", "Read", "Glob", "Grep", "WebFetch", "WebSearch", "Task", "NotebookEdit"],
               cwd=edir, log=log, tag="engineer")
    return r["result"].strip(), r


def run_side(side, task, args):
    issue = task["problem_statement"]
    wt = Path(args.workdir) / task["instance_id"] / args.run / f"side_{side}"
    outdir = OUT / task["instance_id"] / args.run / f"side_{side}"
    outdir.mkdir(parents=True, exist_ok=True)
    log = outdir / "transcript.jsonl"
    log.unlink(missing_ok=True)

    if wt.exists():
        sh(["git", "worktree", "remove", "--force", str(wt)], cwd=base_repo(task), check=False)
    wt.parent.mkdir(parents=True, exist_ok=True)
    sh(["git", "worktree", "add", "--detach", str(wt), task["base_commit"]], cwd=base_repo(task))

    # The agents' Python lives in --workdir: a path with no spaces, so the allow rule matches.
    py = task_py(task, args)
    allowed = [f"Bash({py}:*)", f"Bash({py} *)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(ls:*)", "Bash(cat:*)",
               "Bash(grep:*)", "Bash(find:*)", "Bash(mkdir:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)",
               "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite"]
    common = ["--model", args.model, "--permission-mode", "acceptEdits",
              "--allowedTools", *allowed, "--disallowedTools", "WebFetch", "WebSearch", "Task"]
    # Side a = default, b = verification-first harness, c = lean verification-first harness.
    harness = {"b": "harness_b.md", "c": "harness_c_lean.md"}.get(side)
    if harness:
        common += ["--append-system-prompt", (HERE / harness).read_text()]
    # So tests that run `python -m <package>` in a subprocess find the checkout's code.
    agent_env = {"PYTHONPATH": str(wt)}

    rounds, convo = [], []
    msg = USER_PROMPT.format(issue=issue, py=py)
    session = None
    for i in range(args.max_rounds):
        a = ["--resume", session] if session else []
        r = claude([msg, *a, *common], cwd=wt, log=log, tag=f"agent:{i}", env=agent_env)
        session = r["session_id"]
        convo.append(("agent", r["result"]))
        reply, er = engineer(issue, convo, args.engineer_model, Path(args.workdir) / task["instance_id"] / args.run / f"eng_{side}", log,
                              brief=Path(args.brief).read_text() if args.brief else None)
        rounds.append({"agent": r["result"], "engineer": reply,
                       "agent_cost": r.get("total_cost_usd", 0), "agent_secs": r["_wall"],
                       "agent_turns": r.get("num_turns"), "engineer_cost": er.get("total_cost_usd", 0)})
        print(f"[side {side}] round {i}: engineer -> {reply[:80]!r}")
        if reply.strip().upper().startswith("DONE"):
            break
        convo.append(("engineer", reply))
        msg = reply

    # Collect the agent's diff (including new files), its .verify artifacts.
    sh(["git", "add", "-A", "-N", "."], cwd=wt)
    diff = sh(["git", "diff", "--", ".", ":(exclude).verify"], cwd=wt).stdout
    (outdir / "model.patch").write_text(diff)
    for name in ("plan.md", "report.md"):
        f = wt / ".verify" / name
        if f.exists():
            (outdir / name).write_text(f.read_text())
    (outdir / "rounds.json").write_text(json.dumps(rounds, indent=1))
    return outdir


def run_tests(py, wt, test_files):
    p = sh([py, "-m", "pytest", *test_files, "-rA", "-q", "-p", "no:cacheprovider"], cwd=wt, check=False)
    status = {}
    for line in p.stdout.splitlines():
        for word in ("PASSED", "FAILED", "ERROR"):
            if line.startswith(word + " "):
                nodeid = line.split(" ", 1)[1].split(" - ")[0].strip()
                status[nodeid] = word                    # full id, e.g. tests/x.py::test_y[case]
                status[nodeid.split("::")[-1]] = word    # short id, e.g. test_y (sympy style)
    return status, p.stdout[-4000:]


def score_side(side, task, args):
    outdir = OUT / task["instance_id"] / args.run / f"side_{side}"
    patch = outdir / "model.patch"
    if not patch.exists():
        return
    sc = Path(args.workdir) / task["instance_id"] / args.run / f"score_{side}"
    if sc.exists():
        sh(["git", "worktree", "remove", "--force", str(sc)], cwd=base_repo(task), check=False)
    sh(["git", "worktree", "add", "--detach", str(sc), task["base_commit"]], cwd=base_repo(task))

    applied = True
    if patch.read_text().strip():
        r = sh(["git", "apply", "--whitespace=nowarn", str(patch)], cwd=sc, check=False)
        applied = r.returncode == 0
    # Hidden tests: reset any test files they touch, then apply the official test patch.
    test_files = sorted({l[6:] for l in task["test_patch"].splitlines() if l.startswith("+++ b/")})
    sh(["git", "checkout", task["base_commit"], "--", *test_files], cwd=sc)
    (sc / "_test.patch").write_text(task["test_patch"])
    sh(["git", "apply", "_test.patch"], cwd=sc)

    status, tail = run_tests(task_py(task, args), sc, test_files)
    f2p = json.loads(task["FAIL_TO_PASS"])
    p2p = json.loads(task["PASS_TO_PASS"])
    def look(t):
        if t in status:
            return status[t]
        # SWE-bench truncates test ids at the first space ("test_x[foo, bar-e2]" -> "test_x[foo,").
        # A truncated id can match several tests; all of them must pass.
        hits = [v for k, v in status.items() if "::" in k and k.startswith(t)]
        if not hits:
            return "MISSING"
        return "PASSED" if all(v == "PASSED" for v in hits) else "FAILED"

    res = {
        "patch_applied": applied,
        "fail_to_pass": {t: look(t) for t in f2p},
        "pass_to_pass": {t: look(t) for t in p2p},
    }
    res["resolved"] = applied and all(v == "PASSED" for v in res["fail_to_pass"].values()) \
        and all(v == "PASSED" for v in res["pass_to_pass"].values())

    # The agent's own tests, as it left them, in its own worktree.
    wt = Path(args.workdir) / task["instance_id"] / args.run / f"side_{side}"
    own_status, _ = run_tests(task_py(task, args), wt, test_files)
    own = {k: v for k, v in own_status.items() if "::" in k}  # full ids only, no double count
    res["own_tests"] = {"passed": sum(v == "PASSED" for v in own.values()), "total": len(own)}
    res["pytest_tail"] = tail
    (outdir / "score.json").write_text(json.dumps(res, indent=1))
    print(f"[side {side}] resolved={res['resolved']} F2P={res['fail_to_pass']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--workdir", required=True, help="Folder OUTSIDE this repo for the agents' checkouts")
    ap.add_argument("--sides", default="ab")
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--engineer-model", default="claude-sonnet-5-5")
    ap.add_argument("--max-rounds", type=int, default=6)
    ap.add_argument("--score-only", action="store_true")
    ap.add_argument("--brief", help="File with the engineer's intent (see sim/briefs/); default: the engineer knows only the issue")
    ap.add_argument("--run", default="", help="Run name for repeated runs, e.g. run1 (outputs go in out/<task>/run1/)")
    args = ap.parse_args()

    if Path(args.workdir).resolve().is_relative_to(HERE.parent):
        raise SystemExit("--workdir must be outside this repo, or the repo's CLAUDE.md leaks into both sides")
    task = json.loads(Path(args.task).read_text())
    for side in args.sides:
        if not args.score_only:
            run_side(side, task, args)
        score_side(side, task, args)
    (OUT / task["instance_id"] / args.run).mkdir(parents=True, exist_ok=True)
    (OUT / task["instance_id"] / args.run / "task.json").write_text(json.dumps(
        {**{k: task[k] for k in ("instance_id", "repo", "problem_statement", "FAIL_TO_PASS", "test_patch", "patch")},
         **({"engineer_brief": Path(args.brief).read_text()} if args.brief else {})}, indent=1))
    print("Now run: python3 sim/viewer.py", task["instance_id"])


if __name__ == "__main__":
    main()
