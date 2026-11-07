import { describe, expect, it } from 'vitest';
import { PLANS, CATEGORY } from './plans';
import { changeApproval, claimsOf, freshReview, handoff, lockReview, parsePlanJson } from './review-state';

describe('Exact source plans and approval contract', () => {
  for (const [id, count] of [['bugfix', 7], ['feature', 15], ['refactor', 6], ['formal', 7]] as const) {
    it(`${id} approves and hands off exactly ${count} claims`, () => {
      const plan = PLANS[id]; let state = freshReview(plan, false);
      for (const category of plan.categories) state = changeApproval(state, category.claims.map(c => c.id), true);
      expect(state.approved.size).toBe(count);
      state = lockReview(plan, state); expect(state.locked).toBe(true);
      const payload = handoff(plan); expect(payload.claims).toHaveLength(count);
      expect(payload.claims[0]).toEqual({ id: plan.categories[0]?.claims[0]?.id, text: plan.categories[0]?.claims[0]?.text, kind: plan.categories[0]?.claims[0]?.kind, group: CATEGORY[plan.categories[0]?.cat ?? 'intent'].name });
      expect(Object.keys(payload.claims[0] ?? {}).sort()).toEqual(['group', 'id', 'kind', 'text']);
      expect(changeApproval(state, [payload.claims[0]?.id ?? ''], false)).toBe(state);
    });
  }
  for (const id of ['bugfix', 'feature', 'formal'] as const) {
    it(`${id} starts routine preserved behaviour collapsed`, () => {
      expect(freshReview(PLANS[id], false).open.has('preserved')).toBe(false);
      expect(freshReview(PLANS[id], true).approved.size).toBe(2);
    });
  }
  it('Refactor preserved behaviour is open and never auto-approved', () => {
    const state = freshReview(PLANS.refactor, true);
    expect(state.open.has('preserved')).toBe(true); expect(state.approved.size).toBe(0);
  });
  it('cannot lock an incomplete plan', () => {
    expect(lockReview(PLANS.bugfix, freshReview(PLANS.bugfix, false)).locked).toBe(false);
  });
  it('imports the same Plan JSON shape without changing data', () => {
    expect(parsePlanJson(JSON.stringify(PLANS.formal))).toEqual(PLANS.formal);
  });
  it('rejects duplicate claim IDs', () => {
    const plan = structuredClone(PLANS.bugfix);
    const first = plan.categories[0]?.claims[0]; const second = plan.categories[0]?.claims[1];
    if (!first || !second) throw new Error('Missing fixture'); second.id = first.id;
    expect(() => parsePlanJson(JSON.stringify(plan))).toThrow('Claim IDs must be unique');
  });
  it('rejects invalid JSON and unknown strengths', () => {
    expect(() => parsePlanJson('{')).toThrow('Invalid JSON');
    const json = JSON.stringify(PLANS.bugfix).replace('failpass', 'unverified');
    expect(() => parsePlanJson(json)).toThrow('evidence.0.s');
  });
  it('keeps exact claim text in handoff', () => {
    expect(handoff(PLANS.bugfix).claims.map(c => c.text)).toEqual(claimsOf(PLANS.bugfix).map(c => c.text));
  });
});