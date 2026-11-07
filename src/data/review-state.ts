import { z } from 'zod';
import type { Claim, Plan, Strength } from './types';
import { CATEGORY } from './plans';

export const STRENGTH_ORDER: Strength[] = ['proof', 'generated', 'failpass', 'example', 'static', 'observed'];
export const claimsOf = (plan: Plan) => plan.categories.flatMap(category => category.claims.map(claim => ({ ...claim, category })));
export const strongest = (claim: Claim) => STRENGTH_ORDER.find(strength => claim.evidence.some(e => e.s === strength));
export const handoff = (plan: Plan) => ({ claims: claimsOf(plan).map(({ id, text, kind, category }) => ({ id, text, kind, group: CATEGORY[category.cat].name })) });

export type ReviewState = { approved: Set<string>; open: Set<string>; evidence: Set<string>; locked: boolean };
export function freshReview(plan: Plan, policy: boolean): ReviewState {
  return {
    approved: new Set(plan.categories.filter(c => c.routine && policy).flatMap(c => c.claims.map(k => k.id))),
    open: new Set(plan.categories.filter(c => c.open).map(c => c.cat)),
    evidence: new Set(), locked: false,
  };
}
export function changeApproval(state: ReviewState, ids: string[], value: boolean): ReviewState {
  if (state.locked) return state;
  const approved = new Set(state.approved);
  ids.forEach(id => value ? approved.add(id) : approved.delete(id));
  return { ...state, approved };
}
export function lockReview(plan: Plan, state: ReviewState): ReviewState {
  if (!claimsOf(plan).every(c => state.approved.has(c.id))) return state;
  return { ...state, locked: true };
}

const text = z.string().refine(value => value.trim().length > 0, 'Must not be empty');
const evidenceSchema = z.object({ type: text, s: z.enum(['proof', 'generated', 'failpass', 'example', 'static', 'observed']), what: text.optional(), code: text.optional() }).strict().refine(e => Boolean(e.what || e.code), 'Evidence needs what or code');
const claimSchema = z.object({ id: text, kind: z.enum(['behavior_change', 'no_behavior_change']), text, refs: z.array(text).optional(), sec: z.boolean().optional(), amended: z.boolean().optional(), evidence: z.array(evidenceSchema).min(1) }).strict();
const planSchema = z.object({
  label: text, eyebrow: text, title: text, why: text,
  categories: z.array(z.object({ cat: z.enum(['intent', 'boundaries', 'integration', 'conformance', 'safety', 'budgets', 'formal', 'model', 'preserved']), open: z.boolean(), routine: z.boolean().optional(), claims: z.array(claimSchema).min(1) }).strict()).min(1),
  skipped: z.array(z.tuple([text, text])),
}).strict().superRefine((plan, ctx) => {
  const ids = new Set<string>(); const cats = new Set<string>();
  plan.categories.forEach((category, ci) => {
    if (cats.has(category.cat)) ctx.addIssue({ code: 'custom', path: ['categories', ci, 'cat'], message: 'Category must be unique' });
    cats.add(category.cat);
    category.claims.forEach((claim, ki) => {
      if (ids.has(claim.id)) ctx.addIssue({ code: 'custom', path: ['categories', ci, 'claims', ki, 'id'], message: 'Claim IDs must be unique across the plan' });
      ids.add(claim.id);
    });
  });
});
export function parsePlanJson(input: string): Plan {
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw new Error('Invalid JSON. Check quotes, commas and brackets.'); }
  const result = planSchema.safeParse(parsed);
  if (!result.success) throw new Error(result.error.issues.map(issue => `${issue.path.join('.') || 'Plan'}: ${issue.message}`).join('\n'));
  return result.data;
}

export function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function savePreference(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Storage can be unavailable. */ }
}