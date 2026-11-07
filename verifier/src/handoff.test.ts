import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planToClaims } from './handoff.ts';
import { ROOT } from './sandbox.ts';

test('the h-bearer example plan becomes contract claims', () => {
  const { approvedBy, claims } = planToClaims(readFileSync(join(ROOT, '../verification-first-developer-harness/examples/h-bearer/.verify/plan.md'), 'utf8'));
  assert.equal(approvedBy, 'Jon');
  assert.deepEqual(claims.map((c) => [c.id, c.kind, c.group]), [['c1', 'behavior_change', 'Auth header'], ['c2', 'no_behavior_change', 'Auth header'], ['c3', 'no_behavior_change', 'Auth header']]);
});

test('a draft plan is refused', () => {
  assert.throws(() => planToClaims('# Plan\n\nStatus: DRAFT\n\n## Claims\n\n| # | Claim | Kind |\n| --- | --- | --- |\n| c1 | x | behavior_change |\n'), /not approved/);
});

test('a bad kind is refused', () => {
  assert.throws(() => planToClaims('Status: APPROVED by A on B\n\n## Claims\n\n| # | Claim | Kind |\n| --- | --- | --- |\n| c1 | x | sometimes |\n'), /kind must be/);
});
