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
    for (const c of i.cases) {
      const r = res[c.id];
      const d = decision(a, r);
      if (d === 'missing') continue;
      if (d === 'error') { errors++; continue; }
      scored++;
      if (c.expected === 'bad') { bad++; if (d === 'flag') caught++; else escaped++; }
      else { good++; if (d === 'flag') falseAlarms++; else cleanPasses++; }

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
      perCase.push({ id: c.id, group: c.group, expected: c.expected, approach: a, decision: d, verdict: r.verdict, tokens: calls.reduce((n, u) => n + u.prompt_tokens + u.completion_tokens, 0), minutes: round(caseMinutes) });
    }
    perApproach[a] = {
      scored, errors,
      caught, escaped, catchRate: round(rate(caught, bad), 2),
      falseAlarms, falseAlarmRate: round(rate(falseAlarms, good), 2), cleanPasses,
      tokens, tokensPerCase: tokenCases ? Math.round(tokens / tokenCases) : null, tokensEstimated: estimated,
      effortMinutes: round(minutes), effortMinutesPerCase: round(scored ? minutes / scored : null),
      ...(a === 'verifier' ? {
        planning: { claims: claimCount, words: planningWords },
        review: { needsHuman: humanVerdicts, reasonsToRead },
        evidence: { claimsProven: proven, claimsTotal, reach: round(rate(reached, reachTotal), 2), unstableProbes: unstable, inconclusiveChecks: inconclusive },
      } : {}),
    };
  }
  return { assumptions: ASSUME, approaches: perApproach, cases: perCase };
}

export function toMarkdown(s: ReturnType<typeof score>) {
  const pct = (x: number | null) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
  const rows = Object.entries(s.approaches).map(([a, m]: [string, any]) =>
    `| ${a} | ${m.scored} | ${m.caught} (${pct(m.catchRate)}) | ${m.escaped} | ${m.falseAlarms} (${pct(m.falseAlarmRate)}) | ${m.tokensPerCase ?? 'n/a'}${m.tokensEstimated ? '~' : ''} | ${m.effortMinutesPerCase ?? 'n/a'} |`);
  return ['| Approach | Cases | Defects caught | Defects merged | False alarms | Tokens / case | Dev minutes / case |', '|---|---|---|---|---|---|---|', ...rows,
    '', '~ token counts estimated at 4 characters per token. Minutes use the assumptions in src/metrics.ts.'].join('\n');
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
  const s = score({ cases, results, usage, diffLines });
  writeFileSync(join(dir, 'metrics.json'), JSON.stringify(s, null, 1));
  console.log(toMarkdown(s));
  console.log(`\nFull output: ${join(dir, 'metrics.json')}`);
}
