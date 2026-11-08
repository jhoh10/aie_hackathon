import type { ReviewerState } from './reviewer';
import type { Plan } from './types';
export type ProposedEdit = { item: string; text: string; type: 'claim' | 'check' | 'structure' };
export function proposedEdits(state: ReviewerState): ProposedEdit[] {
  if (state.decision !== 'REQUEST_CHANGES') return [];
  return state.comments.filter(c => c.blocking).map(c => ({ item: c.item, text: c.text, type: c.item.startsWith('T') ? 'check' : c.item.startsWith('A') ? 'structure' : 'claim' }));
}
export function feedbackPlan(base: Plan, edits: ProposedEdit[]): Plan {
  return { ...base, label: 'From review', categories: [...base.categories, { cat: 'review', open: true, routine: false, claims: edits.map((edit, i) => ({ id: `review-${i + 1}`, kind: edit.type === 'claim' ? 'no_behavior_change' : 'behavior_change', text: edit.text, amended: true, refs: [edit.item, edit.type === 'check' ? 'New check' : edit.type === 'structure' ? 'Structure claim' : 'Proposed claim edit'], evidence: [] })) }] };
}