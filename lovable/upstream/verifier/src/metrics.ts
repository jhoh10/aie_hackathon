// node src/metrics.ts <dev|holdout>
// Turns raw benchmark results into the numbers we show: errors caught, defects that would merge,
// false alarms, tokens and developer effort. Definitions are in docs/metrics.md.
// `score` is pure so it can be tested and recomputed from saved results.

export const APPROACHES = ['verifier', 'agent_tests', 'review', 'ci'] as const;
export type Approach = (typeof APPROACHES)[number];

// Which model roles each approach pays for. CI uses no model.
export const ROLES: Record<Approach, string[]> = {
  verifier: ['claims', 'claim_tests', 'probes', 'triage'],
  agent_tests: ['agent_tests'],
  review: ['review'],
  ci: [],
};

// Rough figures for turning counts into minutes. Tune these; every minute figure in the output depends on them.
export const ASSUME = {
  readingWpm: 200, // reading and approving claims in plain English
  reviewLocPerHour: 400, // careful manual code review
  minutesPerVerdict: 0.5, // glancing at a PASS
  minutesPerReason: 3, // following up one BLOCK or NEEDS_HUMAN reason and its evidence
};

export interface CaseInfo { id: string; group: string; expected: 'good' | 'bad'; }
export interface Usage { role: string; prompt_tokens: number; completion_tokens: number; estimated: boolean; }
export interface ScoreInput {
  cases: CaseInfo[];
  results: Partial<Record<Approach, Record<string, any>>>;
  usage?: Record<string, Usage[]>; // case id -> model calls
  diffLines?: Record<string, number>; // case id -> changed non-test Go lines
  liveRuns?: any[]; // server runs, for human wall time
  sim?: Record<string, any>; // case id -> simulated engineer steps (benchmark `sim` step)
}

export type Decision = 'approve' | 'flag' | 'error' | 'missing';

/** Did this approach let the change through or stop it? */
export function decision(approach: Approach, r: any): Decision {
  if (r == null) return 'missing';
  if (r.error) return 'error';
  switch (approach) {
    case 'verifier': return r.verdict === 'PASS' ? 'approve' : 'flag';
    case 'agent_tests': return r.approve ? 'approve' : 'flag';
    case 'review': return r.verdict === 'approve' ? 'approve' : 'flag';
    case 'ci': return r.pass ? 'approve' : 'flag';
  }
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const secs = (ms: number | null) => (ms == null ? null : Math.round(ms / 100) / 10);

/** Human wall time from live server runs (.work/runs/*.json): time to approve claims, and time the engineer waits for a verdict. */
export function liveTimes(runs: any[]) {
  const gap = (a?: string, b?: string) => (a && b ? Date.parse(b) - Date.parse(a) : null);
  const approve = runs.map((r) => gap(r.claimsReadyAt, r.approvedAt)).filter((x): x is number => x != null && x >= 0);
  const wait = runs.map((r) => gap(r.approvedAt, r.doneAt)).filter((x): x is number => x != null && x >= 0);
  return { runs: runs.length, approveSecondsMedian: secs(median(approve)), verdictWaitSecondsMedian: secs(median(wait)), approved: approve.length, finished: wait.length };
}
const rate = (n: number, d: number) => (d ? n / d : null);
const round = (x: number | null, p = 1) => (x == null ? null : Math.round(x * 10 ** p) / 10 ** p);

export function score(i: ScoreInput) {
  const perApproach: Record<string, any> = {};
  const perCase: any[] = [];
  for (const a of APPROACHES) {
    const res = i.results[a];
    if (!res) continue;
    let caught = 0, escaped = 0, falseAlarms = 0, cleanPasses = 0, errors = 0, scored = 0, bad = 0, good = 0;
    let tokens = 0, estimated = false, tokenCases = 0;
    let planningWords = 0, claimCount = 0, reasonsToRead = 0, humanVerdicts = 0, minutes = 0;
    let proven = 0, claimsTotal = 0, reached = 0, reachTotal = 0, unstable = 0, inconclusive = 0;
    const wall: number[] = [];
    const stages: Record<string, number[]> = {};
    for (const c of i.cases) {
      const r = res[c.id];
      const d = decision(a, r);
      if (d === 'missing') continue;
      if (d === 'error') { errors++; continue; }
      scored++;
      if (c.expected === 'bad') { bad++; if (d === 'flag') caught++; else escaped++; }
      else { good++; if (d === 'flag') falseAlarms++; else cleanPasses++; }

      if (typeof r.wallMs === 'number') wall.push(r.wallMs);
      for (const [k, ms] of Object.entries(r.timings ?? {})) if (typeof ms === 'number') (stages[k] ??= []).push(ms);
      const calls = (i.usage?.[c.id] ?? []).filter((u) => ROLES[a].includes(u.role));
      if (calls.length) tokenCases++;
      for (const u of calls) { tokens += u.prompt_tokens + u.completion_tokens; estimated ||= u.estimated; }

      // Developer effort. The verifier asks for claim approval up front and a look at reasons when it flags.
      // Every other approach leaves a person to read the diff to be confident.
      let caseMinutes: number | null = null;
      if (a === 'verifier') {
        const claims: any[] = r.locked?.claims ?? r.claims ?? [];
        const w = claims.reduce((n, x) => n + words(String(x.text ?? '')), 0);
        planningWords += w; claimCount += claims.length;
        const reasons = d === 'flag' ? (r.reasons?.length ?? 1) : 0;
        reasonsToRead += reasons;
        if (r.verdict === 'NEEDS_HUMAN') humanVerdicts++;
        caseMinutes = w / ASSUME.readingWpm + ASSUME.minutesPerVerdict + reasons * ASSUME.minutesPerReason;
        for (const cl of r.claims ?? []) { claimsTotal++; if (cl.result === 'proven') proven++; for (const s of cl.scenarios ?? []) if (s.result === 'inconclusive') inconclusive++; }
        reached += r.reach?.reached ?? 0; reachTotal += r.reach?.total ?? 0;
        unstable += r.probes?.unstable?.length ?? 0;
      } else if (i.diffLines?.[c.id] != null) {
        caseMinutes = (i.diffLines[c.id] / ASSUME.reviewLocPerHour) * 60;
      }
      if (caseMinutes != null) minutes += caseMinutes;
      perCase.push({ id: c.id, group: c.group, expected: c.expected, approach: a, decision: d, verdict: r.verdict, tokens: calls.reduce((n, u) => n + u.prompt_tokens + u.completion_tokens, 0), minutes: round(caseMinutes), wallSeconds: secs(r.wallMs ?? null) });
    }
    perApproach[a] = {
      scored, errors,
      caught, escaped, catchRate: round(rate(caught, bad), 2),
      falseAlarms, falseAlarmRate: round(rate(falseAlarms, good), 2), cleanPasses,
      tokens, tokensPerCase: tokenCases ? Math.round(tokens / tokenCases) : null, tokensEstimated: estimated,
      effortMinutes: round(minutes), effortMinutesPerCase: round(scored ? minutes / scored : null),
      wallSecondsMedian: secs(median(wall)), wallSecondsMax: secs(wall.length ? Math.max(...wall) : null),
      ...(Object.keys(stages).length ? { stageSecondsMedian: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, secs(median(v))])) } : {}),
      ...(a === 'verifier' ? {
        planning: { claims: claimCount, words: planningWords },
        review: { needsHuman: humanVerdicts, reasonsToRead },
        evidence: { claimsProven: proven, claimsTotal, reach: round(rate(reached, reachTotal), 2), unstableProbes: unstable, inconclusiveChecks: inconclusive },
      } : {}),
    };
  }
  return { assumptions: ASSUME, approaches: perApproach, cases: perCase, ...(i.liveRuns ? { live: liveTimes(i.liveRuns) } : {}), ...(i.sim ? { simulated: scoreSim(i.cases, i.sim) } : {}) };
}

// Cognitive load at each human step, measured on agents standing in for the engineer (src/simulate.ts).
// Two flows: today's (read the diff, decide) and ours (approve claims, then read the verdict and decide).
// Load per step: tokens read, evidence opened, turns and self-rated effort (Paas 1-9).
// Load per flow: the sum over its human steps, per case, compared only on cases that have both flows.
export function scoreSim(cases: CaseInfo[], sim: Record<string, any>) {
  const step = (rows: { c: CaseInfo; s: any }[], review: boolean) => {
    const num = (k: string) => median(rows.map((r) => r.s[k]).filter((x): x is number => typeof x === 'number'));
    const out: any = { cases: rows.length, readTokensMedian: num('readTokens'), effortMedian: num('effort'), openedMedian: num('opened'), turnsMedian: num('turns') };
    if (review) {
      const right = rows.filter((r) => (r.c.expected === 'bad') === (r.s.decision === 'block')).length;
      out.correct = right; out.accuracy = round(rate(right, rows.length), 2);
      out.defectsMerged = rows.filter((r) => r.c.expected === 'bad' && r.s.decision === 'merge').length;
      out.goodChangesBlocked = rows.filter((r) => r.c.expected === 'good' && r.s.decision === 'block').length;
    } else out.editedClaims = rows.filter((r) => r.s.decision === 'edit').length;
    return out;
  };
  const rowsFor = (k: string) => cases.flatMap((c) => (sim[c.id]?.[k] ? [{ c, s: sim[c.id][k] }] : []));
  const paired = cases.filter((c) => sim[c.id]?.reviewDiff && sim[c.id]?.planning && sim[c.id]?.reviewVerdict);
  const total = (steps: any[], k: string) => steps.reduce((n, s) => n + (typeof s?.[k] === 'number' ? s[k] : 0), 0);
  const today = paired.map((c) => sim[c.id].reviewDiff);
  const ours = paired.map((c) => [sim[c.id].planning, sim[c.id].reviewVerdict]);
  const flow = (per: any[][]) => ({ readTokensMedian: median(per.map((s) => total(s, 'readTokens'))), effortMedian: median(per.map((s) => total(s, 'effort'))) });
  const t = flow(today.map((s) => [s])), o = flow(ours);
  return {
    steps: { planning: step(rowsFor('planning'), false), reviewDiff: step(rowsFor('reviewDiff'), true), reviewVerdict: step(rowsFor('reviewVerdict'), true) },
    flows: {
      pairedCases: paired.length, today: t, ours: o,
      readingReduction: t.readTokensMedian && o.readTokensMedian ? round(t.readTokensMedian / o.readTokensMedian, 1) : null,
      effortChange: t.effortMedian != null && o.effortMedian != null ? round(o.effortMedian - t.effortMedian, 1) : null,
    },
  };
}

export function toMarkdown(s: ReturnType<typeof score>) {
  const pct = (x: number | null) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
  const rows = Object.entries(s.approaches).map(([a, m]: [string, any]) =>
    `| ${a} | ${m.scored} | ${m.caught} (${pct(m.catchRate)}) | ${m.escaped} | ${m.falseAlarms} (${pct(m.falseAlarmRate)}) | ${m.tokensPerCase ?? 'n/a'}${m.tokensEstimated ? '~' : ''} | ${m.effortMinutesPerCase ?? 'n/a'} | ${m.wallSecondsMedian ?? 'n/a'} |`);
  const out = ['| Approach | Cases | Defects caught | Defects merged | False alarms | Tokens / case | Dev minutes / case | Wall seconds (median) |', '|---|---|---|---|---|---|---|---|', ...rows,
    '', '~ token counts estimated at 4 characters per token. Minutes use the assumptions in src/metrics.ts.'];
  const st = (s.approaches as any).verifier?.stageSecondsMedian;
  if (st) out.push('', 'Verifier wall seconds by stage (median): ' + Object.entries(st).map(([k, v]) => `${k} ${v}`).join(', '));
  const live = (s as any).live;
  const sim = (s as any).simulated;
  if (sim) {
    const r = (x: any) => x ?? 'n/a';
    const { planning: p, reviewDiff: d, reviewVerdict: v } = sim.steps;
    out.push('', 'Simulated engineer: cognitive load at each human step (medians)', '',
      '| Step | Cases | Tokens read | Effort (1-9) | Evidence opened | Right decisions | Defects merged |', '|---|---|---|---|---|---|---|',
      `| Today: review the diff | ${d.cases} | ${r(d.readTokensMedian)} | ${r(d.effortMedian)} | n/a | ${d.correct ?? 0}/${d.cases} | ${d.defectsMerged ?? 0} |`,
      `| Ours: approve claims | ${p.cases} | ${r(p.readTokensMedian)} | ${r(p.effortMedian)} | n/a | n/a (${p.editedClaims ?? 0} edited) | n/a |`,
      `| Ours: review the verdict | ${v.cases} | ${r(v.readTokensMedian)} | ${r(v.effortMedian)} | ${r(v.openedMedian)} | ${v.correct ?? 0}/${v.cases} | ${v.defectsMerged ?? 0} |`,
      '', `Per change, on ${sim.flows.pairedCases} cases with both flows: today reads ${r(sim.flows.today.readTokensMedian)} tokens at effort ${r(sim.flows.today.effortMedian)}; ours reads ${r(sim.flows.ours.readTokensMedian)} tokens at total effort ${r(sim.flows.ours.effortMedian)} over two steps. Reading reduced ${r(sim.flows.readingReduction)}x.`);
  }
  if (live?.runs) out.push('', `Live runs: ${live.runs}. Median time to approve claims: ${live.approveSecondsMedian ?? 'n/a'} s. Median wait for a verdict after approval: ${live.verdictWaitSecondsMedian ?? 'n/a'} s.`);
  return out.join('\n');
}

if (import.meta.main) {
  const { readFileSync, writeFileSync, existsSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { ROOT } = await import('./sandbox.ts');
  const split = process.argv[2] ?? 'dev';
  const dir = join(ROOT, '.work/results', split);
  const read = (f: string) => (existsSync(join(dir, f + '.json')) ? JSON.parse(readFileSync(join(dir, f + '.json'), 'utf8')) : undefined);
  const cases: CaseInfo[] | undefined = read('cases');
  if (!cases) { console.error(`No results in ${dir}. Run: node src/benchmark.ts ${split}`); process.exit(1); }
  const results = Object.fromEntries(APPROACHES.map((a) => [a, read(a)]).filter(([, v]) => v));
  const gen = join(ROOT, '.work/gen');
  const usage: Record<string, Usage[]> = {};
  for (const c of cases) {
    const d = join(gen, c.id);
    if (existsSync(d)) usage[c.id] = readdirSync(d).filter((f) => f.endsWith('.usage.json')).map((f) => JSON.parse(readFileSync(join(d, f), 'utf8')));
  }
  const repo = join(ROOT, '.work/repos/pocketbase');
  const diffLines: Record<string, number> = {};
  if (existsSync(repo)) for (const c of cases as any[]) {
    try {
      const out = execFileSync('git', ['-C', repo, 'diff', '--numstat', `${c.base}..${c.head}`, '--', '*.go', ':!*_test.go']).toString();
      diffLines[c.id] = out.split('\n').filter(Boolean).reduce((n, l) => n + (+l.split('\t')[0] || 0) + (+l.split('\t')[1] || 0), 0);
    } catch {}
  }
  const runsDir = join(ROOT, '.work/runs');
  const liveRuns = existsSync(runsDir) ? readdirSync(runsDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(runsDir, f), 'utf8'))) : [];
  const s = score({ cases, results, usage, diffLines, liveRuns, sim: read('sim') });
  writeFileSync(join(dir, 'metrics.json'), JSON.stringify(s, null, 1));
  console.log(toMarkdown(s));
  console.log(`\nFull output: ${join(dir, 'metrics.json')}`);
}
