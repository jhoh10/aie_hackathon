// Which changed statements did the tests actually execute? From a Go coverage profile and a unified diff.
export function changedLines(diff: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let file = '', line = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(4).replace(/^b\//, ''); continue; }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) { line = +h[1]; continue; }
    if (!file || l.startsWith('--- ') || l.startsWith('diff ')) continue;
    if (l.startsWith('+')) { if (!out.has(file)) out.set(file, new Set()); out.get(file)!.add(line); line++; }
    else if (!l.startsWith('-')) line++;
  }
  return out;
}

export interface Reach { reached: number; total: number; unreached: { file: string; line: number }[]; }

export function reachOfChanged(diff: string, profile: string, modulePrefix = 'github.com/pocketbase/pocketbase/'): Reach {
  const changed = changedLines(diff);
  const blocks = new Map<string, { n: number; c: number; file: string; line: number }>();
  for (const l of profile.split('\n')) {
    const m = l.match(/^(.+):(\d+)\.\d+,(\d+)\.\d+ (\d+) (\d+)$/);
    if (!m) continue;
    const file = m[1].replace(modulePrefix, '');
    const lines = changed.get(file);
    if (!lines) continue;
    const [s, e] = [+m[2], +m[3]];
    let hit = -1;
    for (let k = s; k <= e; k++) if (lines.has(k)) { hit = k; break; }
    if (hit < 0) continue;
    const key = `${file}:${s}:${e}`;
    const prev = blocks.get(key);
    blocks.set(key, { n: +m[4], c: (prev?.c ?? 0) + +m[5], file, line: hit });
  }
  let reached = 0, total = 0;
  const unreached: { file: string; line: number }[] = [];
  for (const b of blocks.values()) { total += b.n; if (b.c > 0) reached += b.n; else unreached.push({ file: b.file, line: b.line }); }
  return { reached, total, unreached };
}
