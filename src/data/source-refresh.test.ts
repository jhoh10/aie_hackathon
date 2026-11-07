import { afterEach, describe, expect, it, vi } from 'vitest';
import html from '../../upstream/verification-first-harness/ui/plan-review.html?raw';
import { PLANS } from './plans';
import { changeApproval, claimsOf, freshReview, handoff, lockReview } from './review-state';
import { parseSourceHtml, reconcileSource, startSourceRefresh } from './source-refresh';

afterEach(() => vi.useRealTimers());
describe('Automatic GitHub source refresh', () => {
  it('reads all four exact plans without executing the source HTML', () => {
    expect(parseSourceHtml(html).plans).toEqual(PLANS);
  });
  it('rejects executable plan initializers', () => {
    expect(() => parseSourceHtml(html.replace('const PLANS = {', 'const PLANS = (() => { throw new Error("executed") })(); const OTHER = {'))).toThrow('Only literal source data');
  });
  it('checks every 60 seconds after completion, never during an update', async () => {
    vi.useFakeTimers();
    let complete: (() => void) | undefined;
    const check = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    const stop = startSourceRefresh(check, vi.fn());
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(check).toHaveBeenCalledTimes(1);
    complete?.(); await vi.advanceTimersByTimeAsync(59_999);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(check).toHaveBeenCalledTimes(2);
    stop(); complete?.(); await vi.advanceTimersByTimeAsync(120_000);
    expect(check).toHaveBeenCalledTimes(2);
  });
  it('continues checking one minute after a failed check', async () => {
    vi.useFakeTimers();
    const check = vi.fn().mockRejectedValue(new Error('Unavailable'));
    const error = vi.fn(); const stop = startSourceRefresh(check, error);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(2); expect(error).toHaveBeenCalledTimes(2); stop();
  });
  it('clears approvals when the same claim ID has new wording', () => {
    const revised = structuredClone(PLANS);
    const claim = revised.bugfix.categories[0]?.claims[0]; if (!claim) throw new Error('Missing fixture');
    claim.text += ' updated';
    const review = changeApproval(freshReview(PLANS.bugfix, false), [claim.id], true);
    const next = reconcileSource(PLANS, { bugfix: review }, revised, false);
    expect(next.plans['bugfix']).toEqual(revised.bugfix);
    expect(next.reviews['bugfix']?.approved.size).toBe(0);
  });
  it('never replaces a locked plan or its verifier handoff', () => {
    const review = lockReview(PLANS.bugfix, changeApproval(freshReview(PLANS.bugfix, false), claimsOf(PLANS.bugfix).map(c => c.id), true));
    const revised = structuredClone(PLANS); revised.bugfix.title = 'Changed upstream';
    const next = reconcileSource(PLANS, { bugfix: review }, revised, false);
    expect(next.plans['bugfix']).toBe(PLANS.bugfix);
    expect(next.reviews['bugfix']).toBe(review);
    expect(handoff(next.plans['bugfix'] ?? revised.bugfix)).toEqual(handoff(PLANS.bugfix));
  });
});