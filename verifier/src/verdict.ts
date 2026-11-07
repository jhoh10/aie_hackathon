// Pure decision logic. No model and no I/O, so every verdict can be recomputed from recorded evidence.
export type Status = 'pass' | 'fail' | 'setup_error';
export interface Observed { status: Status; stable: boolean; }
export type ClaimScenarioResult = 'proven' | 'not_distinguishing' | 'failed' | 'inconclusive';
export type Verdict = 'PASS' | 'BLOCK' | 'NEEDS_HUMAN';

export function classifyClaimScenario(base: Observed, head: Observed): ClaimScenarioResult {
  if (!base.stable || !head.stable) return 'inconclusive';
  if (head.status === 'setup_error') return 'inconclusive';
  if (head.status === 'fail') return 'failed';
  if (base.status === 'pass') return 'not_distinguishing';
  if (base.status === 'setup_error') return 'inconclusive';
  return 'proven';
}

export interface ClaimInput { id: string; kind: 'behavior_change' | 'no_behavior_change'; results: ClaimScenarioResult[]; }
export type ClaimResult = 'proven' | 'failed' | 'unproven';

export function rollupClaim(c: ClaimInput): ClaimResult {
  if (c.results.includes('failed')) return 'failed';
  if (c.kind === 'no_behavior_change') return c.results.includes('not_distinguishing') ? 'proven' : 'unproven';
  return c.results.includes('proven') ? 'proven' : 'unproven';
}

export interface ProbeFinding { id: string; changed: boolean; triage?: 'explained' | 'undeclared' | 'unknown'; severity?: 'breaking' | 'minor'; }

export interface DecideInput {
  claims: { id: string; result: ClaimResult }[];
  probes: ProbeFinding[];
  reach: { reached: number; total: number };
  minReach: number;
}

export function decide(i: DecideInput): { verdict: Verdict; reasons: string[] } {
  const block: string[] = [], human: string[] = [];
  for (const c of i.claims) {
    if (c.result === 'failed') block.push(`Claim ${c.id} does not hold on the new version`);
    if (c.result === 'unproven') human.push(`Claim ${c.id} could not be proven`);
  }
  if (!i.claims.length) human.push('No approved claims');
  for (const p of i.probes.filter((x) => x.changed)) {
    if (p.triage === 'explained') continue;
    // Tuned on the dev split (h-number): a reworded message nobody declared is worth a note, not a person's time.
    if (p.triage === 'undeclared' && p.severity === 'minor') continue;
    if (p.triage === 'undeclared' && p.severity === 'breaking') block.push(`Undeclared breaking behaviour change in probe ${p.id}`);
    else human.push(`Unexplained behaviour change in probe ${p.id}`);
  }
  if (i.reach.total > 0 && i.reach.reached / i.reach.total < i.minReach) {
    human.push(`Tests reached ${i.reach.reached}/${i.reach.total} changed statements`);
  }
  if (block.length) return { verdict: 'BLOCK', reasons: [...block, ...human] };
  if (human.length) return { verdict: 'NEEDS_HUMAN', reasons: human };
  return { verdict: 'PASS', reasons: [] };
}
