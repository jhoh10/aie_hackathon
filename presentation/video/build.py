"""Builds the one-minute demo video: renders each frame with headless Chrome, voices each line with
macOS `say`, and joins them with ffmpeg. Run: python3 build.py <slides dir> <out.mp4>"""
import json, re, subprocess, sys, os, html
from pathlib import Path

HERE = Path(__file__).parent
SLIDES = Path(sys.argv[1])
OUT = Path(sys.argv[2])
WORK = HERE / 'work'; WORK.mkdir(exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
VOICE = 'Samantha'
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">'

def page(body):
    return f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>html,body{{margin:0;width:1920px;height:1080px;overflow:hidden}} aside{{display:none}} section{{box-sizing:border-box;width:1920px;height:1080px;position:relative}} h1,h2,h3,p,ul,table{{margin:0}} td,th{{padding:.35em .6em;border-bottom:1px solid rgba(128,128,128,.35)}} table{{border-collapse:collapse}}</style></head><body>{body}</body></html>'

def slide(name):
    s = (SLIDES / f'{name}.html').read_text()
    # Slide-format arrows don't exist in a plain browser; draw them as text.
    s = re.sub(r'<x-connector[^>]*></x-connector>', '<span style="font-size:44px;color:#4A5563;flex:none">→</span>', s)
    return page(s)

MONO = "'JetBrains Mono', 'Courier New', monospace"
def custom(name):
    if name == 'run':
        lines = [
            ('#8FB3F5', '$ node src/benchmark.ts dev verifier'),
            ('#6F7F90', '# old and new commits in sealed containers, checks written blind to the code'),
            ('#F4F3EE', '22:22:46 inj1 verifier BLOCK reach 8/8'),
            ('#F0A272', '22:22:51 inj2 verifier BLOCK reach 6/6'),
            ('#6F7F90', '# reason: Undeclared breaking behaviour change in probe'),
            ('#6F7F90', '#         p1_username_first_email_collision'),
            ('#6F7F90', '# the same PR in CI: go test ./apis ./core -> ok'),
        ]
        rows = ''.join(f'<p style="font-family:{MONO};font-size:38px;line-height:1.6;color:{c};white-space:pre">{html.escape(t)}</p>' for c, t in lines)
        body = f'<section style="background:#16202B;padding:120px 140px;display:flex;flex-direction:column;gap:36px;font-family:IBM Plex Sans,Arial,sans-serif"><p style="font-family:{MONO};font-size:26px;color:#8FB3F5;letter-spacing:2px;text-transform:uppercase">A real verifier run, case inj2</p><div style="background:#0E161F;border:1px solid #33414F;border-radius:20px;padding:48px 56px">{rows}</div></section>'
        return page(body)
    if name == 'code':
        code = (HERE / 'classify.ts').read_text()
        body = f'''<section style="background:#F4F3EE;color:#16202B;padding:110px 140px;display:flex;flex-direction:column;gap:40px;font-family:'IBM Plex Sans',Arial,sans-serif">
<h2 style="font-size:64px;font-weight:600">Built today</h2>
<div style="display:flex;flex-direction:column;gap:44px">
<pre style="margin:0;background:#16202B;color:#F4F3EE;border-radius:20px;padding:40px;font-family:{MONO};font-size:28px;line-height:1.5;white-space:pre;font-variant-ligatures:none">{html.escape(code)}</pre>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px 64px;font-size:32px;line-height:1.35">
<p><b>Sealed sandbox</b><br><span style="color:#4A5563">each check runs in a fresh container with no internet</span></p>
<p><b>Blind check writer</b><br><span style="color:#4A5563">sees the claims and API docs, never the code</span></p>
<p><b>Old vs new</b><br><span style="color:#4A5563">a check only counts if it fails before and passes after</span></p>
<p><b>20-PR benchmark</b><br><span style="color:#4A5563">real PocketBase fixes, reverts and bad PRs</span></p>
</div></div>
<p style="font-family:{MONO};font-size:24px;color:#4A5563">verifier/src/verdict.ts · github.com/jhoh10/aie_hackathon</p>
</section>'''
        return page(body)
    raise SystemExit('unknown frame ' + name)

script = json.loads((HERE / 'script.json').read_text())
parts = []
for i, sc in enumerate(script):
    kind, name = sc['frame'].split(':')
    htmlf = WORK / f'{i}.html'; png = WORK / f'{i}.png'; aiff = WORK / f'{i}.aiff'; mp4 = WORK / f'{i}.mp4'
    htmlf.write_text(slide(name) if kind == 'slide' else custom(name))
    subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1920,1080',
                    '--virtual-time-budget=4000', f'--screenshot={png}', htmlf.as_uri()], check=True, capture_output=True)
    subprocess.run(['say', '-v', VOICE, '-r', '192', '-o', str(aiff), sc['text']], check=True)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(aiff)]).decode())
    total = dur + 0.45
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', str(png), '-i', str(aiff),
                    '-af', 'apad=pad_dur=0.45', '-t', f'{total:.2f}', '-r', '30', '-c:v', 'libx264', '-tune', 'stillimage',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', str(mp4)], check=True)
    parts.append((mp4, total, sc['text']))
    print(f'{i} {sc["frame"]:16s} {total:5.1f}s')

lst = WORK / 'list.txt'
lst.write_text(''.join(f"file '{p}'\n" for p, _, _ in parts))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', '-movflags', '+faststart', str(OUT)], check=True)
# Captions, so the video works muted too.
t = 0.0; srt = []
for n, (_, d, text) in enumerate(parts, 1):
    f = lambda x: f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
    srt.append(f'{n}\n{f(t)} --> {f(t + d - 0.3)}\n{text}\n'); t += d
OUT.with_suffix('.srt').write_text('\n'.join(srt))
print(f'total {t:.1f}s -> {OUT}')
