import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyClaimScenario as c, rollupClaim, decide } from './verdict.ts';
import { normalize } from './normalize.ts';
const o = (status: 'pass' | 'fail' | 'setup_error', stable = true) => ({ status, stable });

test('a check must fail on old and pass on new to prove a behaviour change', () => {
  assert.equal(c(o('fail'), o('pass')), 'proven');
  assert.equal(c(o('pass'), o('pass')), 'not_distinguishing');
  assert.equal(c(o('fail'), o('fail')), 'failed');
  assert.equal(c(o('pass'), o('fail')), 'failed');
});
test('unstable or unrunnable checks never count as evidence', () => {
  assert.equal(c(o('fail', false), o('pass')), 'inconclusive');
  assert.equal(c(o('pass'), o('setup_error')), 'inconclusive');
  assert.equal(c(o('setup_error'), o('pass')), 'inconclusive');
});
test('a refactor claim is proven by identical pass on both, a change claim is not', () => {
  assert.equal(rollupClaim({ id: 'a', kind: 'no_behavior_change', results: ['not_distinguishing'] }), 'proven');
  assert.equal(rollupClaim({ id: 'a', kind: 'behavior_change', results: ['not_distinguishing'] }), 'unproven');
  assert.equal(rollupClaim({ id: 'a', kind: 'behavior_change', results: ['proven', 'failed'] }), 'failed');
});
const reach = { reached: 9, total: 10 };
test('verdicts', () => {
  const ok = [{ id: 'c1', result: 'proven' as const }];
  assert.equal(decide({ claims: ok, probes: [], reach, minReach: 0.5 }).verdict, 'PASS');
  assert.equal(decide({ claims: [{ id: 'c1', result: 'failed' }], probes: [], reach, minReach: 0.5 }).verdict, 'BLOCK');
  assert.equal(decide({ claims: [], probes: [], reach, minReach: 0.5 }).verdict, 'NEEDS_HUMAN');
  assert.equal(decide({ claims: ok, probes: [], reach: { reached: 1, total: 10 }, minReach: 0.5 }).verdict, 'NEEDS_HUMAN');
  assert.equal(decide({ claims: ok, probes: [{ id: 'p', changed: true, triage: 'undeclared', severity: 'breaking' }], reach, minReach: 0.5 }).verdict, 'BLOCK');
  assert.equal(decide({ claims: ok, probes: [{ id: 'p', changed: true, triage: 'unknown' }], reach, minReach: 0.5 }).verdict, 'NEEDS_HUMAN');
  assert.equal(decide({ claims: ok, probes: [{ id: 'p', changed: true, triage: 'explained' }], reach, minReach: 0.5 }).verdict, 'PASS');
});
test('normalize hides per-run values but keeps real differences', () => {
  const a = normalize({ id: 'abc123def456ghi', created: '2026-01-01 00:00:00.000Z', n: 1 });
  const b = normalize({ n: 1, created: '2026-02-02 10:00:00.000Z', id: 'zzz999yyy888xxx' });
  assert.deepEqual(a, b);
  assert.notDeepEqual(normalize({ n: 1 }), normalize({ n: 2 }));
});
import { reachOfChanged, changedLines } from './reach.ts';
test('reach counts only changed statements that were executed', () => {
  const diff = 'diff --git a/x/a.go b/x/a.go\n--- a/x/a.go\n+++ b/x/a.go\n@@ -1,2 +1,3 @@\n keep\n+added\n keep2\n@@ -10,1 +11,2 @@\n ctx\n+other\n';
  assert.deepEqual([...changedLines(diff).get('x/a.go')!], [2, 12]);
  const profile = 'mode: atomic\ngithub.com/pocketbase/pocketbase/x/a.go:2.1,2.9 3 5\ngithub.com/pocketbase/pocketbase/x/a.go:12.1,12.9 2 0\ngithub.com/pocketbase/pocketbase/x/a.go:40.1,41.9 9 1\n';
  const r = reachOfChanged(diff, profile);
  assert.equal(r.reached, 3); assert.equal(r.total, 5); assert.deepEqual(r.unreached, [{ file: 'x/a.go', line: 12 }]);
});

test('an undeclared minor change is noted, not escalated', () => {
  assert.equal(decide({ claims: [{ id: 'c1', result: 'proven' }], probes: [{ id: 'p', changed: true, triage: 'undeclared', severity: 'minor' }], reach: { reached: 1, total: 1 }, minReach: 0.3 }).verdict, 'PASS');
});
