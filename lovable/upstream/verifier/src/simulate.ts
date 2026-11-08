// Agents stand in for the engineer at each human step, so we can measure cognitive load without human data.
//   planning:        approve or edit the extracted claims (verifier flow only; the usual flow has no planning step)
//   review, diff:    today's flow. Read the issue and diff, then merge or block.
//   review, verdict: our flow. Read the verifier's summary, open evidence only when needed, then merge or block.
// Load per step = tokens the agent had to read, evidence it opened, turns taken and its self-rated effort (Paas, 1-9).
import type { Model } from './model.ts';
import { estimateTokens } from './model.ts';
import * as P from './prompts.ts';

const MAX_OPEN = 3;
const clip = (x: unknown, n = 4000) => { const s = JSON.stringify(x); return s.length > n ? s.slice(0, n) + '…' : s; };

/** What the engineer sees first: the verdict and one line per claim and changed probe. */
export function verdictSummary(vr: any) {
  return {
    verdict: vr.verdict,
    reasons: vr.reasons ?? [],
    claims: (vr.claims ?? []).map((c: any) => ({ id: c.id, text: c.text, result: c.result })),
    changedProbes: (vr.probes?.changed ?? []).map((p: any) => ({ id: p.id, triage: p.triage, severity: p.severity })),
    changedCodeReached: vr.reach?.total ? `${vr.reach.reached}/${vr.reach.total}` : 'unknown',
  };
}

/** Detail behind each line, opened on request. */
export function evidenceById(vr: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of vr.claims ?? []) out[c.id] = clip(c.scenarios ?? []);
  for (const p of vr.probes?.changed ?? []) {
    const run = (vr.probes?.runs ?? []).find((r: any) => r.id === p.id);
    const why = (vr.probes?.triage ?? []).find((t: any) => t.id === p.id)?.why;
    out[p.id] = clip({ why, old: run?.base, new: run?.head });
  }
  return out;
}

const pick = (a: any) => ({ effort: Number(a?.effort) || null, confidence: Number(a?.confidence) || null, why: a?.why });

export async function simPlanning(key: string, issue: string, claims: any[], model: Model) {
  const prompt = P.simPlan(issue, claims);
  const a = await model.json('sim_plan', key, prompt);
  return { step: 'planning', decision: a.decision === 'edit' ? 'edit' : 'approve', edits: Array.isArray(a.edits) ? a.edits.length : 0, readTokens: estimateTokens(prompt), turns: 1, opened: 0, ...pick(a) };
}

export async function simReviewDiff(key: string, c: { issue: string; prTitle: string; prBody: string }, diff: string, model: Model) {
  const prompt = P.simReviewDiff(c.issue, c.prTitle, c.prBody, diff);
  const a = await model.json('sim_review_diff', key, prompt);
  return { step: 'review_diff', decision: a.decision === 'block' ? 'block' : 'merge', readTokens: estimateTokens(prompt), turns: 1, opened: 0, ...pick(a) };
}

export async function simReviewVerdict(key: string, issue: string, vr: any, model: Model) {
  const summary = verdictSummary(vr);
  const evidence = evidenceById(vr);
  const ids = Object.keys(evidence);
  const opened: Record<string, string> = {};
  // readTokens counts what the agent saw by the end: the summary plus every piece of evidence it opened, once.
  for (let turn = 1; ; turn++) {
    const final = turn > MAX_OPEN || Object.keys(opened).length === ids.length;
    const prompt = P.simReviewVerdict(issue, summary, opened, ids, final);
    const a = await model.json(`sim_review_verdict_t${turn}`, key, prompt);
    const id = a?.action === 'open' ? String(a.id) : '';
    if (!final && id in evidence && !(id in opened)) { opened[id] = evidence[id]; continue; }
    return { step: 'review_verdict', decision: a.decision === 'block' ? 'block' : 'merge', readTokens: estimateTokens(prompt), turns: turn, opened: Object.keys(opened).length, ...pick(a) };
  }
}
