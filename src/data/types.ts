export type CategoryId = 'intent' | 'boundaries' | 'integration' | 'conformance' | 'safety' | 'budgets' | 'formal' | 'model' | 'preserved' | 'review';
export type Strength = 'proof' | 'generated' | 'failpass' | 'example' | 'static' | 'observed';
export type Evidence = { type: string; s: Strength; what?: string | undefined; code?: string | undefined };
export type Claim = {
  id: string;
  kind: 'behavior_change' | 'no_behavior_change';
  text: string;
  refs?: string[] | undefined;
  sec?: boolean | undefined;
  amended?: boolean | undefined;
  evidence: Evidence[];
};
export type PlanCategory = { cat: CategoryId; open: boolean; routine?: boolean | undefined; claims: Claim[] };
export type Plan = { label: string; eyebrow: string; title: string; why: string; categories: PlanCategory[]; skipped: [string, string][] };
export type PlanId = 'bugfix' | 'feature' | 'refactor' | 'formal';