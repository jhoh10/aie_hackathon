#!/usr/bin/env python3
"""Render a review packet as the page a reviewer uses.

Usage:
  python3 ui/render.py <review-packet.md> [--diff pr.diff] [-o review.html]

The page shows the packet with problems first. Every "Where" citation opens the
exact diff lines it points to (when --diff is given). The reviewer can comment on
any item, mark comments blocking, pick a decision and copy the result as
.verify/review.md.
"""
import argparse
import html
import json
import re
from pathlib import Path


def esc(s):
    return html.escape(s, quote=True)


def inline(s):
    """Markdown inline: `code` and **bold**."""
    parts = re.split(r"(`[^`]*`)", s)
    out = []
    for p in parts:
        if p.startswith("`") and p.endswith("`") and len(p) > 1:
            out.append(f"<code>{esc(p[1:-1])}</code>")
        else:
            out.append(re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(p)))
    return "".join(out)


def cells(line):
    """Split a markdown table row, ignoring pipes inside `code`."""
    line = line.strip().strip("|")
    out, cur, in_code = [], "", False
    for ch in line:
        if ch == "`":
            in_code = not in_code
        if ch == "|" and not in_code:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return out


def parse_packet(md):
    lines = md.splitlines()
    p = {"title": "", "summary": "", "stats": "", "sections": {}, "notes": {}, "footer": ""}
    sec = None
    for i, l in enumerate(lines):
        if l.startswith("# "):
            p["title"] = re.sub(r"^Review:\s*", "", l[2:].strip())
        elif l.startswith("**") and not p["summary"] and sec is None:
            p["summary"] = l.strip().strip("*")
        elif l.startswith(("Claims proven", "No approved claims")):
            p["stats"] = l.strip()
        elif l.startswith("## "):
            name = re.sub(r"^\d+\.\s*", "", l[3:].strip()).lower()
            sec = ("func" if name.startswith(("what the pr", "functionality")) else
                   "tests" if name.startswith("tests") else
                   "arch" if name.startswith("architecture") else name)
            p["sections"][sec] = []
            p["notes"][sec] = []
        elif l.startswith("Reconciliation:"):
            p["footer"] = l.strip()
        elif sec and l.strip().startswith("|"):
            c = cells(l)
            if all(re.fullmatch(r":?-{2,}:?", x) for x in c if x):
                continue
            p["sections"][sec].append(c)
        elif sec and l.strip() and not l.startswith("---"):
            p["notes"][sec].append(l.strip())
    for k, rows in p["sections"].items():
        if rows:
            head = [h.lower() for h in rows[0]]
            p["sections"][k] = [dict(zip(head, r)) for r in rows[1:]]
    return p


def parse_diff(text):
    """{path: [hunk, ...]}; hunk = list of (kind, old_no, new_no, text)."""
    files, path, hunk, old, new = {}, None, None, 0, 0
    for l in text.splitlines():
        if l.startswith("diff --git"):
            path = l.split(" b/", 1)[-1]
            files.setdefault(path, [])
        elif l.startswith("@@") and path:
            m = re.match(r"@@ -(\d+)(?:,\d+)? \+(\d+)", l)
            old, new = int(m.group(1)), int(m.group(2))
            hunk = []
            files[path].append(hunk)
        elif hunk is not None and path and not l.startswith(("+++", "---", "index ", "new file", "deleted file")):
            if l.startswith("+"):
                hunk.append(("add", "", new, l[1:])); new += 1
            elif l.startswith("-"):
                hunk.append(("del", old, "", l[1:])); old += 1
            elif l.startswith(" ") or l == "":
                hunk.append(("ctx", old, new, l[1:])); old += 1; new += 1
    return files


def cites(where):
    """'a.py:10-20,40; b.py' -> [(path, [(10,20),(40,40)]), (b.py, [])]."""
    out = []
    for m in re.finditer(r"([\w./-]+\.[A-Za-z0-9]+)(?::([\d,\- ]+))?", where):
        rng = []
        for part in (m.group(2) or "").split(","):
            part = part.strip()
            if re.fullmatch(r"\d+-\d+", part):
                a, b = part.split("-"); rng.append((int(a), int(b)))
            elif part.isdigit():
                rng.append((int(part), int(part)))
        out.append((m.group(1), rng, m.group(0)))
    return out


def snippet(files, path, ranges):
    """Diff lines for path that fall in ranges (new-file numbering), with a little context."""
    hunks = files.get(path)
    if hunks is None:
        return None
    rows = []
    for h in hunks:
        for kind, o, n, t in h:
            ln = n if n != "" else o
            if not ranges or any(a - 2 <= ln <= b + 2 for a, b in ranges):
                rows.append((kind, o, n, t))
        if rows and rows[-1][0] != "gap":
            rows.append(("gap", "", "", ""))
    rows = [r for r in rows if r[0] != "gap" or True][:120]
    if not any(r[0] != "gap" for r in rows):
        return None
    body = "".join(
        '<tr class="gap"><td colspan="3">⋯</td></tr>' if k == "gap" else
        f'<tr class="{k}"><td class="ln">{o}</td><td class="ln">{n}</td><td class="tx">{"+" if k == "add" else "−" if k == "del" else " "} {esc(t)}</td></tr>'
        for k, o, n, t in rows[:-1] if True)
    return f'<table class="diff">{body}</table>'


def where_html(where, files, item_id):
    out = []
    for i, (path, ranges, label) in enumerate(cites(where)):
        snip = snippet(files, path, ranges) if files else None
        if snip:
            out.append(f'<details class="cite"><summary>{esc(label)}</summary><div class="snip">{snip}</div></details>')
        else:
            out.append(f'<span class="cite plain">{esc(label)}</span>')
    if not out:
        out.append(f'<span class="cite plain">{inline(where)}</span>')
    return "".join(out)


def claim_badges(claim):
    c = claim.strip()
    if not c or c.lower().startswith("none"):
        extra = c[4:].strip(" ()") if len(c) > 4 else ""
        return f'<span class="badge warn">No claim covers this</span>' + (f'<span class="muted small"> {inline(extra)}</span>' if extra else "")
    return " ".join(f'<span class="badge ok">{inline(x.strip())}</span>' for x in re.split(r",\s*(?![^()]*\))", c))


def status_badge(s):
    k = s.split()[0].lower() if s else ""
    cls = {"new": "ok", "changed": "warn", "removed": "bad"}.get(k, "")
    return f'<span class="badge {cls}">{inline(s)}</span>'


def comment_btn(item_id):
    return f'<button class="cbtn" data-item="{esc(item_id)}" aria-label="Comment on {esc(item_id)}">Comment</button>'


def render(p, files, diff_name):
    stats = p["stats"]
    m_claims = re.search(r"Claims proven:?\s*([^\s(·]+)", stats)
    m_tests = re.search(r"Tests:?\s*([^·]+)", stats)
    src = re.search(r"Claims proven:?\s*\S+\s*\(([^)]*)\)", stats)
    frows = p["sections"].get("func", [])
    def cov(r):
        return r.get("tests", r.get("covered by", r.get("claim", ""))).strip()
    def untested(r):
        c = cov(r).lower().replace("*", "")
        return c.startswith(("no test", "none"))
    n_unc = sum(1 for r in frows if untested(r))

    chips = (f'<div class="chip"><div class="cv">{esc(m_claims.group(1)) if m_claims else "–"}</div><div class="cl">claims proven</div></div>'
             f'<div class="chip"><div class="cv">{esc(m_tests.group(1).strip()) if m_tests else "–"}</div><div class="cl">tests</div></div>'
             f'<div class="chip {"alert" if n_unc else "good"}"><div class="cv">{n_unc}</div><div class="cl">untested behaviour{"s" if n_unc != 1 else ""}</div></div>')

    # What the PR does: one line per behaviour.
    func = ""
    for r in frows:
        i = r.get("#", "")
        text = r.get("behaviour change", r.get("before → after", ""))
        badge = ('<span class="badge warn">No test</span>' if untested(r)
                 else f'<span class="badge ok">{inline(cov(r))}</span>')
        func += (f'<li class="fline{" uncovered" if untested(r) else ""}" id="{esc(i)}"><span class="hid">{esc(i)}</span>'
                 f'<span class="ftext">{inline(text)}</span>{badge}{comment_btn(i)}</li>')

    # 2. Tests
    trows = p["sections"].get("tests", [])
    has_status = any("status" in r for r in trows)
    has_proves = any("proves" in r for r in trows)
    tests = ""
    for r in trows:
        i = r.get("#", "")
        out = r.get("expected output", "")
        changed = "changed" in (r.get("status", "") + out).lower()
        tests += (f'<tr id="{esc(i)}"{" class=changed" if changed else ""}><td class="tid">{esc(i)}</td><td>{inline(r.get("input", ""))}</td>'
                  f'<td>{inline(out)}</td>'
                  + (f'<td>{status_badge(r.get("status", ""))}</td>' if has_status else "")
                  + (f'<td>{inline(r.get("proves", ""))}</td>' if has_proves else "")
                  + f'<td>{comment_btn(i)}</td></tr>')
    thead = "<th>#</th><th>Input</th><th>Expected output</th>" + ("<th>Status</th>" if has_status else "") + ("<th>Proves</th>" if has_proves else "") + "<th></th>"
    test_notes = "".join(f'<p class="note">{inline(n)}</p>' for n in p["notes"].get("tests", []))

    # 3. Architecture
    arch = ""
    for r in p["sections"].get("arch", []):
        i = r.get("#", "")
        arch += (f'<tr id="{esc(i)}"><td class="tid">{esc(i)}</td><td>{inline(r.get("change", ""))}</td>'
                 f'<td>{where_html(r.get("where", ""), files, i)}</td><td>{comment_btn(i)}</td></tr>')
    arch_notes = "".join(f'<p class="note">{inline(n)}</p>' for n in p["notes"].get("arch", []))

    n_func = len(frows)
    data = json.dumps({"title": p["title"]})

    n_tests, n_arch = len(trows), len(p["sections"].get("arch", []))
    tests_section = (f'<section id="tests"><div class="sh"><h2>Tests</h2><span class="muted">{n_tests} cases</span></div>'
                     f'<div class="tw"><table class="t"><thead><tr>{thead}</tr></thead><tbody>{tests}</tbody></table></div>{test_notes}</section>'
                     if n_tests else "")
    arch_section = (f'<section id="arch"><div class="sh"><h2>Architecture changes</h2><span class="muted">{n_arch} items</span></div>'
                    f'<div class="tw"><table class="t"><thead><tr><th>#</th><th>Change</th><th>Where</th><th></th></tr></thead><tbody>{arch}</tbody></table></div>{arch_notes}</section>'
                    if n_arch else "")
    toc_extra = ((f'<a href="#tests">Tests <span class="n">{n_tests}</span></a>' if n_tests else "")
                 + (f'<a href="#arch">Architecture <span class="n">{n_arch}</span></a>' if n_arch else ""))
    return fill(
        PAGE, title=esc(p["title"]), summary=inline(p["summary"]), chips=chips,
        source=esc(src.group(1)) if src else "", func=func, tests_section=tests_section, arch_section=arch_section, toc_extra=toc_extra, test_notes=test_notes,
        arch=arch, arch_notes=arch_notes, footer=inline(p["footer"]), n_func=n_func, n_unc=n_unc,
        n_tests=len(p["sections"].get("tests", [])), n_arch=len(p["sections"].get("arch", [])),
        diffnote=(f"Click any file reference to see those lines of <code>{esc(diff_name)}</code>." if files and n_arch else ""),
        data=data, css=CSS, js=JS)


def fill(template, **kw):
    """Replace {name} placeholders (str.format would trip over the CSS and JS braces)."""
    return re.sub(r"\{(\w+)\}", lambda m: str(kw[m.group(1)]) if m.group(1) in kw else m.group(0), template)


CSS = """
:root{--bg:#f6f5f1;--panel:#fffefb;--ink:#191c22;--soft:#5a6170;--line:#e3e0d7;--code:#f0eee7;
--ok:#1f6f4a;--okbg:#e2f2e9;--warn:#8a4b0f;--warnbg:#fdf0dc;--bad:#a8261b;--badbg:#fbe7e4;--acc:#2a5fd0;--accbg:#e8eefc;
--add:#e3f4e8;--del:#fbe9e7;--alert:#b54708;--shadow:0 1px 2px rgba(20,24,31,.05)}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#13161c;--panel:#1b1f27;--ink:#e8e6e0;--soft:#a3abb8;--line:#2b313d;
--code:#232834;--ok:#7fd1a8;--okbg:#18301f;--warn:#f2b06a;--warnbg:#33260f;--bad:#ff8a80;--badbg:#3a1d1b;--acc:#86a8ff;--accbg:#1d2740;
--add:#16301f;--del:#381c1c;--alert:#f2a65a;--shadow:none}}
:root[data-theme=dark]{--bg:#13161c;--panel:#1b1f27;--ink:#e8e6e0;--soft:#a3abb8;--line:#2b313d;--code:#232834;--ok:#7fd1a8;--okbg:#18301f;
--warn:#f2b06a;--warnbg:#33260f;--bad:#ff8a80;--badbg:#3a1d1b;--acc:#86a8ff;--accbg:#1d2740;--add:#16301f;--del:#381c1c;--alert:#f2a65a;--shadow:none}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
.wrap{max-width:1280px;margin:0 auto;padding:24px 16px 80px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px}
@media (max-width:980px){.wrap{grid-template-columns:1fr}.side{position:static!important}}
header{grid-column:1/-1}.eyebrow{font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}
h1{font-size:26px;line-height:1.25;margin:8px 0 8px}h2{font-size:18px;margin:0}.sum{font-size:17px;margin:0 0 16px;max-width:900px}
.chips{display:flex;gap:12px;flex-wrap:wrap}.chip{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 16px;min-width:140px;box-shadow:var(--shadow)}
.chip .cv{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}.chip .cl{font-size:13px;color:var(--soft)}
.chip.alert{border-color:var(--alert)}.chip.alert .cv{color:var(--alert)}.chip.good .cv{color:var(--ok)}
.src{font-size:13px;color:var(--soft);margin-top:8px}
section{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 18px 8px;margin-bottom:20px;box-shadow:var(--shadow)}
.sh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}.sh .muted{font-size:13px}
section.look{border-left:4px solid var(--alert)}
.hcard,.frow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;padding:12px 0;border-top:1px solid var(--line);align-items:start}
.hcard:first-of-type,.frow:first-of-type{border-top:none}
.hid,.tid{font:700 13px/1.6 ui-monospace,Menlo,monospace;color:var(--soft)}.hcard .hid{color:var(--alert)}
.hwhat{font-weight:600}.hwhy{color:var(--soft);margin-top:2px}
.frow.uncovered{background:var(--warnbg);border-radius:10px;padding:12px 10px;margin:4px -10px;border-top-color:transparent}
.flist{list-style:none;margin:0;padding:0 0 8px}.fline{display:grid;grid-template-columns:40px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:9px 8px;border-top:1px solid var(--line)}
.fline:first-child{border-top:none}.fline.uncovered{background:var(--warnbg);border-radius:10px;border-top-color:transparent;margin:2px 0}
.fline+.fline.uncovered,.fline.uncovered+.fline{border-top-color:transparent}.ftext{font-weight:500}
@media (max-width:640px){.fline{grid-template-columns:36px minmax(0,1fr);}.fline .badge,.fline .cbtn{grid-column:2;justify-self:start}}
.ba{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline}.before{color:var(--soft);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--soft) 50%,transparent)}
.arrow{color:var(--soft)}.after{font-weight:600}.meta{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.badge{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--code);white-space:nowrap}
.badge.ok{background:var(--okbg);color:var(--ok)}.badge.warn{background:var(--warnbg);color:var(--warn);border:1px solid color-mix(in srgb,var(--warn) 35%,transparent)}
.badge.bad{background:var(--badbg);color:var(--bad)}.muted{color:var(--soft)}.small{font-size:13px}
.where{margin-top:6px;display:flex;flex-direction:column;gap:4px}
.cite summary,.cite.plain{display:inline-block;font:12px/1.6 ui-monospace,Menlo,monospace;color:var(--acc);background:var(--accbg);padding:1px 8px;border-radius:6px;cursor:pointer;list-style:none;word-break:break-all}
.cite.plain{cursor:default;color:var(--soft);background:var(--code)}.cite summary::-webkit-details-marker{display:none}
.cite summary::before{content:"▸ ";}.cite[open] summary::before{content:"▾ ";}
.snip{margin-top:6px;border:1px solid var(--line);border-radius:8px;overflow:auto;max-height:340px}
table.diff{border-collapse:collapse;width:100%;font:12px/1.5 ui-monospace,Menlo,monospace}
table.diff td{padding:0 8px;white-space:pre;vertical-align:top}table.diff td.ln{color:var(--soft);text-align:right;width:1%;user-select:none}
table.diff tr.add{background:var(--add)}table.diff tr.del{background:var(--del)}table.diff tr.gap td{color:var(--soft);text-align:center;background:var(--code)}
.tw{overflow-x:auto}table.t{border-collapse:collapse;width:100%;font-size:14px}table.t th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--soft);padding:6px 8px;border-bottom:1px solid var(--line)}
table.t td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}table.t tr:last-child td{border-bottom:none}
table.t tr.changed td{background:var(--warnbg)}
code{font:12.5px ui-monospace,Menlo,monospace;background:var(--code);padding:1px 5px;border-radius:5px;word-break:break-word}
.note{font-size:14px;color:var(--soft);margin:8px 0}.foot{font-size:13px;color:var(--soft);padding:4px 2px}
.cbtn{font:600 12px/1 inherit;font-family:inherit;color:var(--soft);background:transparent;border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap}
.cbtn:hover,.cbtn:focus-visible{color:var(--acc);border-color:var(--acc);outline:none}.cbtn.has{color:var(--acc);border-color:var(--acc);background:var(--accbg)}
.side{position:sticky;top:16px;align-self:start;display:flex;flex-direction:column;gap:16px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow)}
.panel h3{font-size:15px;margin:0 0 10px}.dec{display:grid;gap:8px}
.dec button{font:600 14px/1 inherit;font-family:inherit;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer;text-align:left}
.dec button[aria-pressed=true].approve{background:var(--okbg);color:var(--ok);border-color:var(--ok)}
.dec button[aria-pressed=true].changes{background:var(--badbg);color:var(--bad);border-color:var(--bad)}
.dec button[aria-pressed=true].comment{background:var(--accbg);color:var(--acc);border-color:var(--acc)}
.clist{display:flex;flex-direction:column;gap:10px;max-height:46vh;overflow:auto}.citem{border:1px solid var(--line);border-radius:10px;padding:8px}
.citem .ch a{color:inherit}.citem .ch{display:flex;justify-content:space-between;align-items:center;font:700 12px ui-monospace,Menlo,monospace;color:var(--acc);margin-bottom:6px}
.citem textarea{width:100%;min-height:58px;font:14px/1.4 inherit;font-family:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px;resize:vertical}
.citem label{font-size:13px;color:var(--soft);display:flex;gap:6px;align-items:center;margin-top:4px}
.x{border:none;background:none;color:var(--soft);cursor:pointer;font-size:16px;line-height:1}
.copy{width:100%;margin-top:12px;font:600 14px/1 inherit;font-family:inherit;padding:11px;border-radius:10px;border:none;background:var(--acc);color:#fff;cursor:pointer}
.copy:disabled{opacity:.45;cursor:not-allowed}.status{font-size:13px;color:var(--soft);margin-top:8px;min-height:1.2em}
pre.out{white-space:pre-wrap;font:12px/1.45 ui-monospace,Menlo,monospace;background:var(--code);border-radius:8px;padding:8px;max-height:220px;overflow:auto;display:none}
.toc{display:flex;flex-direction:column;gap:6px;font-size:14px}.toc a{color:var(--ink);text-decoration:none;display:flex;justify-content:space-between}
.toc a:hover{color:var(--acc)}.toc .n{color:var(--soft);font-variant-numeric:tabular-nums}.toc .n.alert{color:var(--alert);font-weight:700}
"""

JS = r"""
const DATA = JSON.parse(document.getElementById('data').textContent);
const state = {decision: null, comments: []};
const KEY = 'review:' + DATA.title;
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) Object.assign(state, s); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
const list = document.getElementById('clist'), copyBtn = document.getElementById('copy'), out = document.getElementById('out');

function draw() {
  document.querySelectorAll('.dec button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === state.decision)));
  document.querySelectorAll('.cbtn').forEach(b => b.classList.toggle('has', state.comments.some(c => c.item === b.dataset.item)));
  list.innerHTML = state.comments.length ? '' : '<p class="muted small" style="margin:0">Click “Comment” on any item to critique it. Comments point at packet items, not lines of code.</p>';
  state.comments.forEach((c, i) => {
    const d = document.createElement('div'); d.className = 'citem';
    d.innerHTML = `<div class="ch"><a href="#${c.item}">${c.item}</a><button class="x" aria-label="Remove comment">×</button></div>
      <textarea placeholder="What should change?"></textarea>
      <label><input type="checkbox"> Blocking</label>`;
    const ta = d.querySelector('textarea'), cb = d.querySelector('input');
    ta.value = c.text; cb.checked = c.blocking;
    ta.addEventListener('input', () => { c.text = ta.value; save(); });
    cb.addEventListener('change', () => { c.blocking = cb.checked; save(); });
    d.querySelector('.x').addEventListener('click', () => { state.comments.splice(i, 1); save(); draw(); });
    list.appendChild(d);
  });
  copyBtn.disabled = !state.decision;
  const blocking = state.comments.filter(c => c.blocking).length;
  document.getElementById('warn').textContent = (state.decision === 'APPROVE' && blocking)
    ? `You have ${blocking} blocking comment${blocking > 1 ? 's' : ''}. Approve only if they can wait, or choose Request changes.` : '';
}
document.querySelectorAll('.cbtn').forEach(b => b.addEventListener('click', () => {
  const item = b.dataset.item;
  state.comments.push({item, text: '', blocking: /^(H|F)/.test(item)});
  if (!state.decision) state.decision = 'REQUEST_CHANGES';
  save(); draw();
  const tas = list.querySelectorAll('textarea'); tas[tas.length - 1].focus();
}));
document.querySelectorAll('.dec button').forEach(b => b.addEventListener('click', () => { state.decision = b.dataset.d; save(); draw(); }));
copyBtn.addEventListener('click', async () => {
  const rows = state.comments.map(c => `| ${c.item} | ${(c.text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} | ${c.blocking ? 'Yes' : 'No'} | ${c.blocking ? 'claim or check edit in .verify/plan.md' : ''} |`).join('\n');
  const md = `# Review decision: ${DATA.title}\n\nDecision: ${state.decision}\nReviewer: <name> · ${new Date().toISOString().slice(0, 10)}\nPacket: .verify/review-packet.md\n\n## Comments\n\n| On | Comment | Blocking? | Becomes |\n| --- | --- | --- | --- |\n${rows}\n`;
  out.textContent = md; out.style.display = 'block';
  const st = document.getElementById('status');
  try { await navigator.clipboard.writeText(md); st.textContent = 'Copied. Save it as .verify/review.md.'; }
  catch (e) { st.textContent = 'Select the text above and copy it to .verify/review.md.'; }
});
draw();
"""

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Review Packet</title><style>{css}</style></head><body>
<div class="wrap">
<header>
  <div class="eyebrow">Review packet · review the change, not the code</div>
  <h1>{title}</h1>
  <p class="sum">{summary}</p>
  <div class="chips">{chips}</div>
  <div class="src">Claims source: {source}. {diffnote}</div>
</header>
<main>
  <section id="func"><div class="sh"><h2>What the PR does</h2><span class="muted">{n_func} behaviour changes · <b style="color:var(--warn)">{n_unc} with no test</b></span></div><ul class="flist">{func}</ul></section>
  {tests_section}
  {arch_section}
  <p class="foot">{footer}</p>
</main>
<aside class="side">
  <div class="panel"><h3>On this page</h3><nav class="toc">
    <a href="#func">What the PR does <span class="n">{n_func}</span></a>
    {toc_extra}</nav></div>
  <div class="panel"><h3>Your decision</h3>
    <div class="dec" role="group" aria-label="Decision">
      <button class="approve" data-d="APPROVE">✓ Approve</button>
      <button class="changes" data-d="REQUEST_CHANGES">Request changes</button>
      <button class="comment" data-d="COMMENT">Comment only</button>
    </div><div class="status" id="warn" role="status" style="color:var(--warn)"></div></div>
  <div class="panel"><h3>Comments</h3><div class="clist" id="clist"></div>
    <button class="copy" id="copy" disabled>Copy as review.md</button><div class="status" id="status" role="status"></div><pre class="out" id="out"></pre></div>
</aside>
</div>
<script type="application/json" id="data">{data}</script>
<script>{js}</script>
</body></html>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("packet")
    ap.add_argument("--diff")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    p = parse_packet(Path(a.packet).read_text())
    files = parse_diff(Path(a.diff).read_text()) if a.diff else {}
    out = Path(a.out) if a.out else Path(a.packet).with_name("review.html")
    out.write_text(render(p, files, Path(a.diff).name if a.diff else ""))
    print(out)


if __name__ == "__main__":
    main()
