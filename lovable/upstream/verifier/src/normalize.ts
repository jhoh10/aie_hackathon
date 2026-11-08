// Replaces values that legitimately differ per run, so old and new responses can be compared.
const ISO = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
const JWT = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
const PBID = /^[a-z0-9]{15}$/;
const VOLATILE = new Set(['created', 'updated', 'token', 'tokenKey', 'password', 'salt', 'duration', 'requestId']);

export function normalize(value: unknown): unknown {
  const ids = new Map<string, string>();
  const walk = (v: unknown, key?: string): unknown => {
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, walk((v as Record<string, unknown>)[k], k)]));
    }
    if (typeof v !== 'string') return v;
    if (key && VOLATILE.has(key)) return `<${key}>`;
    if (ISO.test(v)) return '<time>';
    if (JWT.test(v)) return '<jwt>';
    if (PBID.test(v)) { if (!ids.has(v)) ids.set(v, `<id${ids.size + 1}>`); return ids.get(v); }
    return v.replace(/\b[a-z0-9]{15}\b/g, (m) => { if (!/\d/.test(m)) return m; if (!ids.has(m)) ids.set(m, `<id${ids.size + 1}>`); return ids.get(m)!; });
  };
  return walk(value);
}

export interface StepRecord { id: string; setup: boolean; method: string; path: string; responseStatus?: number; responseBody?: unknown; failures: string[]; }
export interface ScenarioRun { id: string; status: 'pass' | 'fail' | 'setup_error'; steps: StepRecord[]; error?: string; }

/** A comparable fingerprint of what the app did, ignoring per-run values. */
export function fingerprint(run: ScenarioRun): string {
  return JSON.stringify(normalize(run.steps.map((s) => ({ id: s.id, method: s.method, status: s.responseStatus, body: s.responseBody }))));
}
