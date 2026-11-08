import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simReviewVerdict, simPlanning, simReviewDiff, verdictSummary, evidenceById } from './simulate.ts';

const vr = {
  verdict: 'BLOCK', reasons: ['Claim c1 does not hold on the new version'],
  claims: [{ id: 'c1', text: 'bearer works in any case', result: 'failed', scenarios: [{ id: 's1', result: 'failed' }] }],
  probes: { changed: [{ id: 'p1', triage: 'undeclared', severity: 'breaking' }], runs: [{ id: 'p1', base: { status: 'pass' }, head: { status: 'fail' } }], triage: [{ id: 'p1', why: 'auth broke' }] },
  reach: { reached: 3, total: 4 }, locked: { claims: [{ id: 'c1', text: 'bearer works in any case' }] },
};
// A scripted model: answers per role, and records the prompts it saw.
const fake = (answers: Record<string, any>) => {
  const seen: Record<string, string> = {};
  return { seen, model: { name: 'fake', json: async (role: string, _k: string, prompt: string) => { seen[role] = prompt; return answers[role]; } } };
};

test('the verdict summary leaves evidence out until it is opened', () => {
  const s = verdictSummary(vr);
  assert.deepEqual(s.claims, [{ id: 'c1', text: 'bearer works in any case', result: 'failed' }]);
  assert.equal(s.changedCodeReached, '3/4');
  assert.deepEqual(Object.keys(evidenceById(vr)), ['c1', 'p1']);
  assert.match(evidenceById(vr).p1, /auth broke/);
});

test('the reviewer opens evidence turn by turn, then decides', async () => {
  const { model, seen } = fake({ sim_review_verdict_t1: { action: 'open', id: 'p1' }, sim_review_verdict_t2: { decision: 'block', effort: 3, confidence: 0.9 } });
  const r = await simReviewVerdict('k', 'issue', vr, model);
  assert.deepEqual([r.decision, r.turns, r.opened, r.effort], ['block', 2, 1, 3]);
  assert.doesNotMatch(seen.sim_review_verdict_t1, /auth broke/);
  assert.match(seen.sim_review_verdict_t2, /auth broke/);
  assert.ok(r.readTokens > 0);
});

test('the reviewer is forced to decide once evidence runs out or the limit is hit', async () => {
  const open = { action: 'open', id: 'nope' };
  const { model, seen } = fake({ sim_review_verdict_t1: { action: 'open', id: 'c1' }, sim_review_verdict_t2: { action: 'open', id: 'p1' }, sim_review_verdict_t3: { decision: 'merge', effort: 5 } });
  const r = await simReviewVerdict('k', 'issue', vr, model);
  assert.deepEqual([r.turns, r.opened, r.decision], [3, 2, 'merge']);
  assert.match(seen.sim_review_verdict_t3, /You must decide now/);
  const bad = fake({ sim_review_verdict_t1: open });
  assert.equal((await simReviewVerdict('k', 'issue', vr, bad.model)).turns, 1);
});

test('planning and diff review record decision, effort and reading load', async () => {
  const { model } = fake({ sim_plan: { decision: 'edit', edits: [{ id: 'c1', text: 'x' }], effort: 4 }, sim_review_diff: { decision: 'merge', effort: 7 } });
  const p = await simPlanning('k', 'issue', vr.locked.claims, model);
  assert.deepEqual([p.decision, p.edits, p.effort], ['edit', 1, 4]);
  const d = await simReviewDiff('k', { issue: 'i', prTitle: 't', prBody: 'b' }, 'x'.repeat(4000), model);
  assert.deepEqual([d.decision, d.effort], ['merge', 7]);
  assert.ok(d.readTokens >= 1000);
});
