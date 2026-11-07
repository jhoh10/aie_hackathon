#!/usr/bin/env python3
"""Build a side-by-side HTML view of one simulated task.

Usage: python3 sim/viewer.py sympy__sympy-24661
Writes sim/out/<instance_id>/compare.html
"""
import html
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent / "out"
SIDES = {"a": "Side A · default harness", "b": "Side B · verification-first harness",
         "c": "Side C · lean verification-first"}


def esc(s):
    return html.escape(str(s), quote=True)


def md(text):
    """Tiny markdown: headings, tables, code fences, bullets, bold, inline code."""
    out, lines, i = [], text.splitlines(), 0

    def inline(s):
        s = esc(s)
        s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
        return s

    while i < len(lines):
        l = lines[i]
        if l.startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            out.append("<pre>" + esc("\n".join(lines[i + 1:j])) + "</pre>")
            i = j + 1
            continue
        if l.strip().startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
                    rows.append(cells)
                i += 1
            if rows:
                h = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
                b = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
                out.append(f'<div class="tw"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>')
            continue
        m = re.match(r"(#{1,4})\s+(.*)", l)
        if m:
            out.append(f"<h5>{inline(m.group(2))}</h5>")
        elif re.match(r"\s*([-*]|\d+\.)\s+", l):
            bullet = inline(re.sub(r"^\s*([-*]|\d+\.)\s+", "• ", l))
            out.append(f'<div class="li">{bullet}</div>')
        elif l.strip():
            out.append(f"<p>{inline(l)}</p>")
        i += 1
    return "\n".join(out)


def summarize_tool(name, inp):
    if name in ("Read", "Write", "Edit", "NotebookEdit"):
        return Path(inp.get("file_path", "")).name or inp.get("file_path", "")
    if name == "Bash":
        return inp.get("command", "")[:140]
    if name in ("Grep", "Glob"):
        return inp.get("pattern", "")
    if name == "TodoWrite":
        return f'{len(inp.get("todos", []))} items'
    return ""


def result_text(c):
    if isinstance(c, list):
        return "\n".join(x.get("text", "") for x in c if isinstance(x, dict))
    return str(c or "")


def load_side(d):
    events = [json.loads(l) for l in (d / "transcript.jsonl").read_text().splitlines() if l.strip()]
    rounds = json.loads((d / "rounds.json").read_text())
    score = json.loads((d / "score.json").read_text()) if (d / "score.json").exists() else {}
    patch = (d / "model.patch").read_text() if (d / "model.patch").exists() else ""
    plan = (d / "plan.md").read_text() if (d / "plan.md").exists() else ""
    report = (d / "report.md").read_text() if (d / "report.md").exists() else ""
    return events, rounds, score, patch, plan, report


def timeline(events, rounds, issue):
    items = [f'<div class="msg eng"><div class="who">Engineer</div><p>Please resolve this GitHub issue.</p>'
             f'<details><summary>Issue text</summary><div class="md">{md(issue)}</div></details></div>']
    results = {}
    for e in events:
        if e.get("type") == "user":
            for c in e.get("message", {}).get("content", []) or []:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    results[c.get("tool_use_id")] = (result_text(c.get("content")), c.get("is_error"))
    cur_round = None
    for e in events:
        tag = e.get("_tag", "")
        if not tag.startswith("agent:"):
            continue
        r = int(tag.split(":")[1])
        if cur_round is not None and r != cur_round and cur_round < len(rounds):
            items.append(f'<div class="msg eng"><div class="who">Engineer (simulated)</div><div class="md">{md(rounds[cur_round]["engineer"])}</div></div>')
        cur_round = r
        if e.get("type") != "assistant":
            continue
        for c in e.get("message", {}).get("content", []) or []:
            if c.get("type") == "text" and c.get("text", "").strip():
                items.append(f'<div class="msg agent"><div class="who">Agent</div><div class="md">{md(c["text"])}</div></div>')
            elif c.get("type") == "tool_use":
                name, inp = c.get("name"), c.get("input", {})
                res, err = results.get(c.get("id"), ("", False))
                body = esc(json.dumps(inp, indent=1)[:3000])
                out = esc(res[:3000]) + ("\n…" if len(res) > 3000 else "")
                cls = "tool err" if err else "tool"
                test = " test" if name == "Bash" and "pytest" in inp.get("command", "") else ""
                items.append(f'<details class="{cls}{test}"><summary><span class="tn">{esc(name)}</span> '
                             f'<span class="ts">{esc(summarize_tool(name, inp))}</span></summary>'
                             f'<pre>{body}</pre><pre class="res">{out}</pre></details>')
    if cur_round is not None and cur_round < len(rounds):
        items.append(f'<div class="msg eng"><div class="who">Engineer (simulated)</div><div class="md">{md(rounds[cur_round]["engineer"])}</div></div>')
    return "\n".join(items)


def diff_html(patch):
    rows = []
    for l in patch.splitlines():
        cls = "add" if l.startswith("+") and not l.startswith("+++") else \
              "del" if l.startswith("-") and not l.startswith("---") else \
              "hdr" if l.startswith(("diff ", "@@", "+++", "---", "index", "new file")) else ""
        rows.append(f'<span class="{cls}">{esc(l)}</span>')
    return '<pre class="diff">' + "\n".join(rows) + "</pre>"


def stats(events, rounds, score, patch):
    tools = [c for e in events if e.get("_tag", "").startswith("agent:") and e.get("type") == "assistant"
             for c in e.get("message", {}).get("content", []) or [] if c.get("type") == "tool_use"]
    test_runs = sum(1 for c in tools if c.get("name") == "Bash" and "pytest" in c.get("input", {}).get("command", ""))
    secs = sum(r.get("agent_secs", 0) for r in rounds)
    cost = sum((r.get("agent_cost") or 0) for r in rounds)
    files = len(re.findall(r"^diff --git", patch, re.M))
    added = sum(1 for l in patch.splitlines() if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in patch.splitlines() if l.startswith("-") and not l.startswith("---"))
    f2p = score.get("fail_to_pass", {})
    p2p = score.get("pass_to_pass", {})
    return {
        "resolved": score.get("resolved"),
        "hidden": f"{sum(v == 'PASSED' for v in f2p.values())}/{len(f2p)}",
        "kept": f"{sum(v == 'PASSED' for v in p2p.values())}/{len(p2p)}",
        "own": f'{score.get("own_tests", {}).get("passed", "–")}/{score.get("own_tests", {}).get("total", "–")}',
        "engineer": sum(1 for r in rounds if not r["engineer"].strip().upper().startswith("DONE")),
        "tools": len(tools), "test_runs": test_runs,
        "time": f"{secs / 60:.1f} min", "cost": f"${cost:.2f}" if cost else "–",
        "diff": f"{files} files · +{added} −{removed}",
    }


def card(side, st):
    ok = st["resolved"]
    badge = '<span class="badge ok">Resolved</span>' if ok else \
            '<span class="badge bad">Not resolved</span>' if ok is False else '<span class="badge">Not scored</span>'
    rows = [("Hidden test (the real fix’s test)", st["hidden"]), ("Existing tests still passing", st["kept"]),
            ("Times the engineer was needed", st["engineer"]), ("Tool calls", st["tools"]),
            ("Test runs by the agent", st["test_runs"]), ("Agent time", st["time"]),
            ("Cost", st["cost"]), ("Change size", st["diff"])]
    r = "".join(f"<div class='k'>{esc(k)}</div><div class='v'>{esc(v)}</div>" for k, v in rows)
    return f'<div class="card side-{side}"><div class="ch"><h3>{esc(SIDES[side])}</h3>{badge}</div><div class="kv">{r}</div></div>'


CSS = """
:root{--bg:#f6f4ee;--panel:#fffefb;--ink:#1a1d24;--soft:#4a5160;--line:#e2ded4;--a:#8a4b12;--b:#2a5fd0;--c:#1f7a52;
--ok:#1f7a52;--okbg:#e3f3ea;--bad:#b42318;--badbg:#fbe9e7;--eng:#fff6e8;--agent:#eef2fb;--code:#f1efe8;--add:#e6f4ea;--del:#fcebea}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#14181f;--panel:#1c212b;--ink:#e9e6df;--soft:#aab2c0;
--line:#2c3444;--a:#f2a65a;--b:#7aa2ff;--c:#7fd1a8;--ok:#7fd1a8;--okbg:#1d3328;--bad:#ff8a80;--badbg:#3a2020;--eng:#2b2519;--agent:#1f2738;
--code:#232937;--add:#1b3324;--del:#3a1f1f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}h3{font-size:16px;margin:0}h5{font-size:14px;margin:10px 0 4px}
.sub{color:var(--soft);margin:0 0 16px}.issue{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px}
.grid{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:16px}@media (max-width:900px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;border-top:4px solid var(--a)}
.card.side-b{border-top-color:var(--b)}.card.side-c{border-top-color:var(--c)}.ch{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.badge{font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--code)}
.badge.ok{background:var(--okbg);color:var(--ok)}.badge.bad{background:var(--badbg);color:var(--bad)}
.kv{display:grid;grid-template-columns:1fr auto;gap:4px 16px}.k{color:var(--soft)}.v{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.col{display:flex;flex-direction:column;gap:8px;min-width:0}.colh{font-weight:700;padding:6px 0;border-bottom:2px solid var(--a);margin-bottom:4px}
.colh.b{border-color:var(--b)}.colh.c{border-color:var(--c)}
.msg{border-radius:10px;padding:10px 14px;border:1px solid var(--line)}.msg.eng{background:var(--eng)}.msg.agent{background:var(--agent)}
.who{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--soft);margin-bottom:2px}
.msg p{margin:4px 0}.li{margin:2px 0 2px 8px}
details.tool{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:4px 10px;font-size:13px}
details.tool.test{border-left:3px solid var(--ok)}details.tool.err{border-left:3px solid var(--bad)}
details summary{cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tn{font-weight:700;font-family:ui-monospace,Menlo,monospace}.ts{color:var(--soft);font-family:ui-monospace,Menlo,monospace}
pre{background:var(--code);border-radius:6px;padding:8px;overflow:auto;max-height:360px;font:12px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
code{background:var(--code);padding:1px 4px;border-radius:4px;font:13px ui-monospace,Menlo,monospace}
.tw{overflow-x:auto}table{border-collapse:collapse;font-size:13px;margin:6px 0;width:100%}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}
th{background:var(--code)}.diff .add{background:var(--add);display:block}.diff .del{background:var(--del);display:block}.diff .hdr{color:var(--soft)}
.diff{max-height:520px}.empty{color:var(--soft);font-style:italic}
"""


def main():
    inst = sys.argv[1]
    base = OUT / inst
    task = json.loads((base / "task.json").read_text())
    data = {s: load_side(base / f"side_{s}") for s in SIDES if (base / f"side_{s}" / "rounds.json").exists()}
    st = {s: stats(d[0], d[1], d[2], d[3]) for s, d in data.items()}
    hidden = md("```\n" + "\n".join(l[1:] for l in task["test_patch"].splitlines()
                                    if l.startswith("+") and not l.startswith("+++")) + "\n```")

    def two(fn):
        return f'<div class="grid" style="--n:{len(data)}">' + "".join(f'<div class="col">{fn(s, d)}</div>' for s, d in data.items()) + "</div>"

    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Harness Side by Side</title><style>{CSS}</style></head><body><div class="wrap">
<h1>Harness side by side</h1>
<p class="sub">SWE-bench Verified · <code>{esc(inst)}</code> · same issue, model, tools and simulated engineer on both sides</p>
<div class="issue"><b>The issue</b><div class="md">{md(task["problem_statement"])}</div>
<details><summary>Hidden test used for scoring (neither side saw it)</summary>{hidden}</details></div>
<h2>Scoreboard</h2>
<div class="grid" style="--n:{len(data)}">{"".join(card(s, st[s]) for s in data)}</div>
<h2>Test plan and report</h2>
{two(lambda s, d: f'<div class="colh {s}">{esc(SIDES[s])}</div>' + (f'<div class="card side-{s}"><h5>.verify/plan.md</h5><div class="md">{md(d[4])}</div></div>' if d[4] else '<div class="card side-a"><p class="empty">No test plan: this side went straight to code.</p></div>') + (f'<div class="card side-{s}"><h5>.verify/report.md</h5><div class="md">{md(d[5])}</div></div>' if d[5] else ''))}
<h2>The final change</h2>
{two(lambda s, d: f'<div class="colh {s}">{esc(SIDES[s])}</div>' + (diff_html(d[3]) if d[3].strip() else '<p class="empty">No change.</p>'))}
<h2>Full conversation</h2>
<p class="sub">Click a tool call to see its input and output. Green edge = a test run.</p>
{two(lambda s, d: f'<div class="colh {s}">{esc(SIDES[s])}</div>' + timeline(d[0], d[1], task["problem_statement"]))}
</div></body></html>"""
    (base / "compare.html").write_text(page)
    print(base / "compare.html")


if __name__ == "__main__":
    main()
