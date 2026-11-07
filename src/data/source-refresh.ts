import { parse } from 'acorn';
import { z } from 'zod';
import { CATEGORY, STRENGTH } from './plans';
import { freshReview, parsePlanJson, type ReviewState } from './review-state';
import type { Plan, CategoryId, Strength } from './types';

export const SOURCE_URL = 'https://raw.githubusercontent.com/jhoh10/aie_hackathon/main/verification-first-developer-harness/ui/plan-review.html';
export const REFRESH_INTERVAL = 60_000;
export type SourceBundle = { plans: Record<string, Plan>; categories: typeof CATEGORY; strengths: typeof STRENGTH };
const nodeSchema = z.object({ type: z.string() }).passthrough();
function literal(input: unknown): unknown {
  const node = nodeSchema.parse(input);
  if (node.type === 'Literal' && (typeof node['value'] === 'string' || typeof node['value'] === 'boolean' || node['value'] === null)) return node['value'];
  if (node.type === 'ArrayExpression') return z.array(z.unknown()).parse(node['elements']).map(literal);
  if (node.type === 'ObjectExpression') {
    const result: Record<string, unknown> = Object.create(null);
    for (const inputProperty of z.array(z.unknown()).parse(node['properties'])) {
      const property = nodeSchema.parse(inputProperty);
      if (property.type !== 'Property' || property['kind'] !== 'init' || property['computed'] || property['method'] || property['shorthand']) throw new Error('Source contains executable data.');
      const key = nodeSchema.parse(property['key']);
      const name = z.string().parse(key.type === 'Identifier' ? key['name'] : key['value']);
      if (['__proto__', 'constructor', 'prototype'].includes(name) || Object.hasOwn(result, name)) throw new Error('Unsafe or duplicate source key.');
      result[name] = literal(property['value']);
    }
    return result;
  }
  throw new Error('Only literal source data is supported.');
}

export function parseSourceHtml(html: string): SourceBundle {
  if (html.length > 2_000_000) throw new Error('Source page is too large.');
  const constants: Record<string, unknown> = {};
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const script = match[1]; if (!script) continue;
    const program = parse(script, { ecmaVersion: 'latest', sourceType: 'script' });
    for (const statement of program.body) {
      if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') continue;
      for (const declaration of statement.declarations) {
        if (declaration.id.type !== 'Identifier' || !['PLANS', 'CATEGORY', 'STRENGTH'].includes(declaration.id.name)) continue;
        if (Object.hasOwn(constants, declaration.id.name)) throw new Error('Duplicate source declaration.');
        constants[declaration.id.name] = literal(declaration.init);
      }
    }
  }
  const rawPlans = z.record(z.unknown()).parse(constants['PLANS']);
  const plans: Record<string, Plan> = {};
  for (const [id, value] of Object.entries(rawPlans)) {
    if (!/^[a-z][a-z0-9_-]*$/.test(id) || ['imported', 'constructor', 'prototype'].includes(id)) throw new Error('Unsupported source plan ID.');
    plans[id] = parsePlanJson(JSON.stringify(value));
  }
  if (!plans['bugfix']) throw new Error('Source is missing the bugfix plan.');
  const categories = { ...CATEGORY };
  const strengths = { ...STRENGTH };
  const rawCategories = z.record(z.object({ name: z.string().min(1), note: z.string().min(1) }).strict()).parse(constants['CATEGORY']);
  const rawStrengths = z.record(z.object({ label: z.string().min(1), tip: z.string().min(1) }).strict()).parse(constants['STRENGTH']);
  for (const id of Object.keys(CATEGORY) as CategoryId[]) {
    const value = rawCategories[id]; if (!value) throw new Error('Missing category metadata.'); categories[id] = value;
  }
  for (const id of Object.keys(STRENGTH) as Strength[]) {
    const value = rawStrengths[id]; if (!value) throw new Error('Missing strength metadata.'); strengths[id] = value;
  }
  return { plans, categories, strengths };
}

// Recursive scheduling starts the next minute only after fetch, validation and application finish.
export function startSourceRefresh(check: () => Promise<void>, onError: (error: unknown) => void, interval = REFRESH_INTERVAL) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function run() {
    try { await check(); } catch (error) { if (!stopped) onError(error); }
    finally { if (!stopped) timer = setTimeout(() => void run(), interval); }
  }
  void run();
  return () => { stopped = true; if (timer !== undefined) clearTimeout(timer); };
}

export function reconcileSource(current: Record<string, Plan>, reviews: Record<string, ReviewState>, source: Record<string, Plan>, policy: boolean) {
  const plans = { ...source };
  const nextReviews = { ...reviews };
  for (const [id, plan] of Object.entries(current)) {
    if (id === 'imported' || reviews[id]?.locked) { plans[id] = plan; continue; }
    if (JSON.stringify(plan) !== JSON.stringify(source[id])) {
      if (source[id]) nextReviews[id] = freshReview(source[id], policy);
      else delete nextReviews[id];
    }
  }
  return { plans, reviews: nextReviews };
}