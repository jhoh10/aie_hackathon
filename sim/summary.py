#!/usr/bin/env python3
"""Average repeated runs of one task and build out/<task>/summary.html.

Usage: python3 sim/summary.py pylint-dev__pylint-8898
Expects out/<task>/run*/side_*/ from `run.py --run runN`. Also builds each run's compare.html.
"""
import json
import statistics
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from viewer import CSS, SIDES, esc, md  # noqa: E402

OUT = HERE / "out"


def metrics(d):
    ev = [json.loads(l) for l in (d / "transcript.jsonl").read_text().splitlines() if l.strip()]
    rounds = json.loads((d / "rounds.json").read_text())
    score = json.loads((d / "score.json").read_text())
    agent = [e for e in ev if e.get("_tag", "").startswith("agent")]
    results = [e for e in agent if e.get("type") == "result"]
    tools = [c for e in agent if e.get("type") == "assistant"
             for c in e["message"]["content"] if c.get("type") == "tool_use"]
    narration = [c for e in agent if e.get("type") == "assistant"
                 for c in e["message"]["content"] if c.get("type") == "text"]
    patch = (d / "model.patch").read_text()
    p2p = score["pass_to_pass"]
    return {
        "resolved": bool(score["resolved"]),
        "kept": f"{sum(v == 'PASSED' for v in p2p.values())}/{len(p2p)}",
        "cost": sum(r.get("total_cost_usd", 0) for r in results),
        "mins": sum(r.get("duration_ms", 0) for r in results) / 60000,
        "steps": sum(r.get("num_turns", 0) for r in results),
        "context": sum(r.get("usage", {}).get("cache_read_input_tokens", 0) for r in results) / 1000,
        "engineer": sum(1 for r in rounds if not r["engineer"].strip().upper().startswith("DONE")),
        "words_to_engineer": sum(len(r["agent"].split()) for r in rounds),
        "first_msg": len(rounds[0]["agent"].split()) if rounds else 0,
        "last_msg": len(rounds[-1]["agent"].split()) if rounds else 0,
        "tool_calls": len(tools),
        "test_runs": sum(1 for c in tools if c["name"] == "Bash" and "pytest" in c["input"].get("command", "")),
        "lines_added": sum(1 for l in patch.splitlines() if l.startswith("+") and not l.startswith("+++")),
        "first_reply": rounds[0]["engineer"] if rounds else "",
    }


ROWS = [  # key, label, format, lower is better?
    ("cost", "Cost", "${:.2f}", True),
    ("mins", "Agent time (min)", "{:.1f}", True),
    ("steps", "Model steps", "{:.0f}", True),
    ("context", "Context re-read (k tokens)", "{:.0f}", True),
    ("engineer", "Engineer replies needed", "{:.1f}", True),
    ("words_to_engineer", "Words the engineer reads", "{:.0f}", True),
    ("first_msg", "First message (words)", "{:.0f}", True),
    ("last_msg", "Final message (words)", "{:.0f}", True),
    ("tool_calls", "Tool calls", "{:.0f}", True),
    ("test_runs", "Test runs", "{:.0f}", None),
    ("lines_added", "Lines added", "{:.0f}", None),
]


def main():
    inst = sys.argv[1]
    base = OUT / inst
    runs = sorted(p.name for p in base.glob("run*") if p.is_dir())
    data = {}  # side -> list of (run, metrics)
    for r in runs:
        subprocess.run([sys.executable, str(HERE / "viewer.py"), f"{inst}/{r}"], check=True, capture_output=True)
        for s in SIDES:
            d = base / r / f"side_{s}"
            if (d / "score.json").exists():
                data.setdefault(s, []).append((r, metrics(d)))
    task = json.loads((base / runs[0] / "task.json").read_text())
    sides = list(data)

    # Headline: resolved count and mean cost per side.
    head = ""
    for s in sides:
        ms = [m for _, m in data[s]]
        ok = sum(m["resolved"] for m in ms)
        head += (f'<div class="card side-{s}"><div class="ch"><h3>{esc(SIDES[s])}</h3>'
                 f'<span class="badge {"ok" if ok == len(ms) else "bad" if ok == 0 else ""}">{ok}/{len(ms)} resolved</span></div>'
                 f'<div class="kv"><div class="k">Mean cost</div><div class="v">${statistics.mean(m["cost"] for m in ms):.2f}</div>'
                 f'<div class="k">Mean time</div><div class="v">{statistics.mean(m["mins"] for m in ms):.1f} min</div>'
                 f'<div class="k">Words the engineer reads</div><div class="v">{statistics.mean(m["words_to_engineer"] for m in ms):.0f}</div></div></div>')

    # Mean (min–max) table.
    th = "".join(f"<th>{esc(SIDES[s])}</th>" for s in sides)
    body = ""
    for key, label, fmt, lower in ROWS:
        means = {s: statistics.mean(m[key] for _, m in data[s]) for s in sides}
        best = (min if lower else max)(means.values()) if lower is not None else None
        cells = ""
        for s in sides:
            vals = [m[key] for _, m in data[s]]
            txt = fmt.format(means[s])
            rng = f' <span class="rng">({fmt.format(min(vals))}–{fmt.format(max(vals))})</span>' if len(vals) > 1 else ""
            b = " best" if best is not None and means[s] == best else ""
            cells += f'<td class="num{b}">{txt}{rng}</td>'
        body += f"<tr><td>{esc(label)}</td>{cells}</tr>"

    # Per-run table.
    per = ""
    for r in runs:
        per += f'<tr><td><a href="{r}/compare.html">{r}</a></td>'
        for s in sides:
            m = dict(data[s]).get(r)
            if m:
                per += (f'<td>{"✅" if m["resolved"] else "❌"} ${m["cost"]:.2f} · {m["mins"]:.1f} min · '
                        f'{m["engineer"]} repl{"y" if m["engineer"] == 1 else "ies"}<div class="rng">'
                        f'Engineer: “{esc(m["first_reply"][:140])}{"…" if len(m["first_reply"]) > 140 else ""}”</div></td>')
            else:
                per += "<td>–</td>"
        per += "</tr>"

    css = CSS + """table.sum td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td.best{font-weight:700;color:var(--ok)}.rng{color:var(--soft);font-size:12px;font-weight:400}
table.sum{font-size:14px}table.sum td,table.sum th{padding:6px 10px}a{color:var(--b)}"""
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Harness Repeat Runs</title><style>{css}</style></head><body><div class="wrap">
<h1>Harness comparison over {len(runs)} runs</h1>
<p class="sub">SWE-bench Verified · <code>{esc(inst)}</code> · each side run {len(runs)} times with the same model, tools and simulated engineer</p>
<div class="issue"><b>The issue</b><div class="md">{md(task["problem_statement"][:1200])}</div></div>
<h2>Headline</h2><div class="grid" style="--n:{len(sides)}">{head}</div>
<h2>Averages</h2><p class="sub">Mean over runs, with the range in brackets. Green = best mean.</p>
<div class="tw"><table class="sum"><thead><tr><th>Metric</th>{th}</tr></thead><tbody>{body}</tbody></table></div>
<h2>Each run</h2><p class="sub">Click a run to see its full side-by-side conversation.</p>
<div class="tw"><table class="sum"><thead><tr><th>Run</th>{th}</tr></thead><tbody>{per}</tbody></table></div>
</div></body></html>"""
    (base / "summary.html").write_text(page)
    print(base / "summary.html")
    for s in sides:
        ms = [m for _, m in data[s]]
        print(s, f"resolved {sum(m['resolved'] for m in ms)}/{len(ms)}",
              " ".join(f"{k}={statistics.mean(m[k] for m in ms):.2f}" for k, *_ in ROWS))


if __name__ == "__main__":
    main()
