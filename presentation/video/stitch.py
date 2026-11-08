"""Puts a recorded narration under the rendered frames. Run after build.py has rendered work/<n>.png.
python3 stitch.py <narration.wav> <out.mp4>   (timing.json holds per-scene durations and the tempo)"""
import json, subprocess, sys
from pathlib import Path
HERE = Path(__file__).parent; W = HERE / 'work'
wav, out = sys.argv[1], Path(sys.argv[2])
t = json.load(open(HERE / 'timing.json'))
lst = W / 'stitch.txt'
lines = []
for i, d in enumerate(t['durations']):
    frame = W / f'{i}.png'
    lines += [f"file '{frame}'", f'duration {d:.3f}']
last = W / f"{len(t['durations']) - 1}.png"
lines.append(f"file '{last}'")  # concat demuxer needs the last frame repeated
lst.write_text('\n'.join(lines) + '\n')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', wav,
                '-filter:a', f"atempo={t['tempo']},aresample=48000", '-vf', 'fps=30,format=yuv420p',
                '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
# Captions on the same timings.
sc = json.load(open(HERE / 'script.json')); acc = 0.0; srt = []
f = lambda x: f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(x*1000%1000):03d}'
for n, (s, d) in enumerate(zip(sc, t['durations']), 1):
    srt.append(f"{n}\n{f(acc)} --> {f(acc + d - 0.2)}\n{s['text']}\n"); acc += d
out.with_suffix('.srt').write_text('\n'.join(srt))
print('done', out)
