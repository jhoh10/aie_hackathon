import { describe, expect, it } from 'vitest';
import source from '../../upstream/verification-first-reviewer-harness/examples/pylint-8898/.verify/review-packet.md?raw';
import { addReviewComment, exportReview, parseReviewPacket } from './reviewer';

describe('Source reviewer contract', () => {
  const packet = parseReviewPacket(source);
  it('retains the latest six behaviors and six tests without inventing architecture rows', () => {
    expect(packet.behaviors).toHaveLength(6); expect(packet.tests).toHaveLength(6); expect(packet.architecture).toHaveLength(0);
    expect(packet.behaviors.filter(item => item.untested).map(item => item.id)).toEqual(['F4', 'F5', 'F6']);
  });
  it('defaults behavior feedback to blocking and requests changes', () => {
    const state = addReviewComment({ decision: null, comments: [] }, 'F3');
    expect(state.decision).toBe('REQUEST_CHANGES'); expect(state.comments[0]?.blocking).toBe(true);
  });
  it('test feedback starts nonblocking and does not replace an existing decision', () => {
    const state = addReviewComment({ decision: 'COMMENT', comments: [] }, 'T4');
    expect(state.decision).toBe('COMMENT'); expect(state.comments[0]?.blocking).toBe(false);
  });
  it('exports blocking feedback as a claim or check edit with the chosen decision', () => {
    const state = addReviewComment({ decision: null, comments: [] }, 'F3');
    const result = exportReview(packet, state, 'Reviewer', '2026-11-07');
    expect(result).toContain('Decision: REQUEST_CHANGES');
    expect(result).toContain('| F3 |  | Yes | claim or check edit in .verify/plan.md |');
  });
  it('requires a decision before export', () => {
    expect(() => exportReview(packet, { decision: null, comments: [] }, '', '2026-11-07')).toThrow('Choose a review decision');
  });
});