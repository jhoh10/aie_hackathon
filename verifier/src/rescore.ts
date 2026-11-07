// node src/rescore.ts <split...>  Applies the current verdict rules to saved verifier results, in place.
// The verdict a run recorded at the time is kept as recordedVerdict / recordedReasons.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './sandbox.ts';
import { decide } from './verdict.ts';
for (const split of process.argv.slice(2)) {
  const f = join(ROOT, '.work/results', split, 'verifier.json');
  if (!existsSync(f)) continue;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  for (const [id, r] of Object.entries<any>(v)) {
    if (!r?.claims) continue;
    // Findings from the dropped instability rule (no triage entry) don't count.
    const probes = (r.probes?.changed ?? []).filter((p: any) => !(r.probes?.newlyUnstable ?? []).includes(p.id) || r.probes?.triage?.some((t: any) => t.id === p.id));
    const d = decide({ claims: r.claims, probes, reach: r.reach, minReach: 0.3 });
    r.recordedVerdict ??= r.verdict; r.recordedReasons ??= r.reasons;
    if (r.verdict !== d.verdict) console.log(split, id, r.recordedVerdict, '->', d.verdict);
    r.verdict = d.verdict; r.reasons = d.reasons;
  }
  writeFileSync(f, JSON.stringify(v, null, 1));
}
