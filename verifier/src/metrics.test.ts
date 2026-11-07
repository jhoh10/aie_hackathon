import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, decision, toMarkdown, ASSUME } from './metrics.ts';

const cases = [
  { id: 'good1', group: 'honest', expected: 'good' as const },
  { id: 'bad1', group: 'revert', expected: 'bad' as const },
  { id: 'bad2', group: 'injected', expected: 'bad' as const },
];
const claims = [{ id: 'c1', text: 'one two three four five', kind: 'behavior_change' }];
const v = (verdict: string, reasons: string[] = []) => ({ verdict, reasons, locked: { claims }, claims: [{ id: 'c1', result: verdict === 'PASS' ? 'proven' : 'unproven', scenarios: [{ result: 'proven' }, { result: 'inconclusive' }] }], reach: { reached: 3, total: 4 }, probes: { unstable: ['p1'] } });

test('each approach maps to approve or flag', () => {
  assert.equal(decision('verifier', { verdict: 'NEEDS_HUMAN' }), 'flag');
  assert.equal(decision('verifier', { verdict: 'PASS' }), 'approve');
  assert.equal(decision('review', { verdict: 'request_changes' }), 'flag');
  assert.equal(decision('agent_tests', { approve: true }), 'approve');
  assert.equal(decision('ci', { pass: false }), 'flag');
  assert.equal(decision('ci', { error: 'boom' }), 'error');
  assert.equal(decision('ci', undefined), 'missing');
});

test('catch rate, merged defects and false alarms come from ground truth', () => {
  const s = score({ cases, results: {
    verifier: { good1: v('PASS'), bad1: v('BLOCK', ['a', 'b']), bad2: v('NEEDS_HUMAN', ['c']) },
    ci: { good1: { pass: true }, bad1: { pass: true }, bad2: { pass: false } },
    review: { good1: { verdict: 'request_changes' }, bad1: { verdict: 'approve' }, bad2: { error: 'x' } },
  } });
  const m = s.approaches;
  assert.deepEqual([m.verifier.caught, m.verifier.escaped, m.verifier.falseAlarms, m.verifier.catchRate], [2, 0, 0, 1]);
  assert.deepEqual([m.ci.caught, m.ci.escaped, m.ci.catchRate], [1, 1, 0.5]);
  assert.deepEqual([m.review.scored, m.review.errors, m.review.falseAlarms, m.review.falseAlarmRate, m.review.escaped], [2, 1, 1, 1, 1]);
  assert.equal(m.agent_tests, undefined);
});

test('tokens count only the roles an approach uses', () => {
  const u = (role: string, p: number, c: number, estimated = false) => ({ role, prompt_tokens: p, completion_tokens: c, estimated });
  const s = score({ cases: [cases[0]], results: { verifier: { good1: v('PASS') }, review: { good1: { verdict: 'approve' } }, ci: { good1: { pass: true } } },
    usage: { good1: [u('claims', 100, 10), u('claim_tests', 200, 50), u('review', 300, 30, true)] } });
  assert.equal(s.approaches.verifier.tokens, 360);
  assert.equal(s.approaches.verifier.tokensEstimated, false);
  assert.equal(s.approaches.review.tokens, 330);
  assert.equal(s.approaches.review.tokensEstimated, true);
  assert.equal(s.approaches.ci.tokens, 0);
  assert.equal(s.approaches.ci.tokensPerCase, null);
});

test('developer effort: claims plus reasons for the verifier, reading the diff otherwise', () => {
  const s = score({ cases: cases.slice(0, 2), results: { verifier: { good1: v('PASS'), bad1: v('BLOCK', ['a', 'b']) }, ci: { good1: { pass: true }, bad1: { pass: true } } },
    diffLines: { good1: 40, bad1: 80 } });
  const ver = s.approaches.verifier;
  assert.deepEqual(ver.planning, { claims: 2, words: 10 });
  assert.deepEqual(ver.review, { needsHuman: 0, reasonsToRead: 2 });
  const expected = 2 * (5 / ASSUME.readingWpm + ASSUME.minutesPerVerdict) + 2 * ASSUME.minutesPerReason;
  assert.equal(ver.effortMinutes, Math.round(expected * 10) / 10);
  assert.equal(s.approaches.ci.effortMinutes, Math.round(((120 / ASSUME.reviewLocPerHour) * 60) * 10) / 10);
  assert.deepEqual(ver.evidence, { claimsProven: 1, claimsTotal: 2, reach: 0.75, unstableProbes: 2, inconclusiveChecks: 2 });
  assert.match(toMarkdown(s), /\| verifier \| 2 \| 1 \(100%\) \| 0 \|/);
});
