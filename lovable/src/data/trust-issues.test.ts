import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './packets';
import { PLANS } from './plans';
import { addReviewComment, parseReviewPacket } from './reviewer';
import { feedbackPlan, proposedEdits } from './feedback';
import { freshReview, lockReview } from './review-state';
describe('Trust Issues acceptance rules', () => {
  it('pylint has six behaviours and six tests, with F4–F6 untested and T6 changed', () => {
    const packet = EXAMPLES.find(e => e.id === 'pylint-8898')?.packet;
    expect(packet?.behaviors).toHaveLength(6); expect(packet?.tests).toHaveLength(6);
    expect(packet?.behaviors.filter(i => i.untested).map(i => i.id)).toEqual(['F4','F5','F6']);
    expect(packet?.tests.find(i => i.id === 'T6')?.changed).toBe(true);
  });
  it('sympy has zero untested behaviours', () => { expect(EXAMPLES.find(e => e.id === 'sympy-24661')?.packet.behaviors.filter(i => i.untested)).toHaveLength(0); });
  it('unchanged expectations are never classified as changed tests', () => { expect(EXAMPLES.find(e => e.id === 'pylint-8898')?.packet.tests.filter(i => i.changed).map(i => i.id)).toEqual(['T6']); expect(EXAMPLES.find(e => e.id === 'sympy-24661')?.packet.tests.filter(i => i.changed)).toEqual([]); });
  it('both no-plan examples retain null approved claims', () => { expect(EXAMPLES.filter(e => e.claimsProven === null).map(e => e.id)).toEqual(['pylint-8898-default-agent','pylint-6386-upstream']); });
  it('blocking F4 feedback becomes an unapproved no-behavior-change claim', () => {
    const review = addReviewComment({decision:null,comments:[]},'F4'); review.comments[0] && (review.comments[0].text = 'Keep commas inside parentheses splitting.');
    const plan = feedbackPlan(PLANS.bugfix,proposedEdits(review)); const category = plan.categories.at(-1);
    expect(category?.cat).toBe('review'); expect(category?.claims[0]?.kind).toBe('no_behavior_change');
    expect(category?.claims[0]?.text).toBe('Keep commas inside parentheses splitting.');
    expect(freshReview(plan,true).approved.has('review-1')).toBe(false); expect(lockReview(plan,freshReview(plan,true)).locked).toBe(false);
  });
  it('T and A comments map to check and structure edits', () => { expect(proposedEdits({decision:'REQUEST_CHANGES',comments:[{id:1,item:'T2',text:'Add escaped comma.',blocking:true},{id:2,item:'A1',text:'Use utils.',blocking:true}]}).map(i => i.type)).toEqual(['check','structure']); });
  it('nonblocking feedback and other decisions never enter the claim-edit loop', () => { expect(proposedEdits({decision:'APPROVE',comments:[{id:1,item:'F4',text:'x',blocking:true}]})).toEqual([]); expect(proposedEdits({decision:'REQUEST_CHANGES',comments:[{id:1,item:'F4',text:'x',blocking:false}]})).toEqual([]); });
  it('supports a packet with no tests', () => { expect(parseReviewPacket('# Review: A change\n\n**A change.**\n\nNo approved claims · Tests 0 new, 0 changed · Untested behaviours 1\n\n## What the PR does\n| F1 | Before → after | **No test** |').tests).toEqual([]); });
});