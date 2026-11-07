// A tiny in-browser stand-in for the PocketBase auth endpoints the h-bearer case exercises,
// so the verifier's scenarios can run live without Docker.
import claimTests from "../../../upstream/verification-first-harness/examples/h-bearer/answers/claim_tests.json";
import probesJson from "../../../upstream/verification-first-harness/examples/h-bearer/answers/probes.json";
import triageJson from "../../../upstream/verification-first-harness/examples/h-bearer/answers/triage.json";
import {
  classifyClaimScenario,
  decide,
  rollupClaim,
  type ClaimResult,
  type ClaimScenarioResult,
  type Verdict,
} from "../../../upstream/verifier/src/verdict";

export const SUPERUSER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.c3VwZXJ1c2Vy.sig";

export type Build = "correct" | "buggy" | "noop";
export const BUILDS: Record<Build, { label: string; note: string }> = {
  correct: { label: "Correct fix", note: "Prefix matched case-insensitively, token still checked." },
  buggy: { label: "Buggy fix", note: "Lowercase prefix skips the token check: any token gets in." },
  noop: { label: "Forgot the change", note: "The agent says it's done, but the code is unchanged." },
};
export type Version = "old" | Build;

export type Step = {
  id: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  expect?: { status: number; paths?: Record<string, string | number> };
};
export type Scenario = { id: string; claim: string | null; kind: "claim" | "probe"; steps: Step[] };

export const CLAIM_SCENARIOS = (claimTests as { scenarios: Scenario[] }).scenarios;
export const PROBE_SCENARIOS = (probesJson as { scenarios: Scenario[] }).scenarios;
const TRIAGE = new Map(
  (triageJson as { findings: { id: string; triage: "explained" | "undeclared" | "unknown"; severity: "breaking" | "minor"; why: string }[] }).findings.map(
    (f) => [f.id, f],
  ),
);

export type Response = { status: number; body: unknown };

/** Simulated PocketBase: which token does the Authorization header carry? */
function authenticated(header: string | undefined, v: Version): boolean {
  if (!header) return false;
  let token = header;
  if (v === "old" || v === "noop") {
    if (header.startsWith("Bearer ")) token = header.slice(7);
  } else if (/^bearer /i.test(header)) {
    if (v === "buggy" && header.startsWith("bearer ")) return true; // the bug
    token = header.slice(7);
  }
  return token === SUPERUSER_TOKEN;
}

export function request(method: string, path: string, authHeader: string | undefined, v: Version): Response {
  const ok = authenticated(authHeader, v);
  const route = path.split("?")[0];
  if (method === "POST" && route === "/api/collections/_superusers/auth-refresh") {
    return ok
      ? { status: 200, body: { token: "…", record: { collectionName: "_superusers" } } }
      : { status: 401, body: { status: 401, message: "The request requires valid record authorization token." } };
  }
  if (method === "GET" && route === "/api/collections/_superusers/records") {
    return ok
      ? { status: 200, body: { page: 1, totalItems: 1, items: [{ collectionName: "_superusers" }] } }
      : { status: 403, body: { status: 403, message: "Only superusers can perform this action." } };
  }
  return { status: 404, body: { status: 404, message: "Not found." } };
}

const dig = (o: unknown, path: string) =>
  path.split(".").reduce<unknown>((x, k) => (x && typeof x === "object" ? (x as Record<string, unknown>)[k] : undefined), o);

const fill = (h?: Record<string, string>) => h?.["Authorization"]?.replace("{{superuser_token}}", SUPERUSER_TOKEN);

export function runStep(step: Step, v: Version) {
  const res = request(step.method, step.path, fill(step.headers), v);
  let pass = true;
  if (step.expect) {
    pass = res.status === step.expect.status && Object.entries(step.expect.paths ?? {}).every(([p, val]) => dig(res.body, p) === val);
  }
  return { res, pass };
}

export type ScenarioRun = {
  scenario: Scenario;
  old: { status: number; pass: boolean };
  head: { status: number; pass: boolean };
  result: ClaimScenarioResult;
};
export type ClaimRun = { id: string; text: string; kind: "behavior_change" | "no_behavior_change"; scenarios: ScenarioRun[]; result: ClaimResult };
export type ProbeRun = { scenario: Scenario; old: number; head: number; changed: boolean; triage?: string | undefined; why?: string | undefined };
export type Report = { claims: ClaimRun[]; probes: ProbeRun[]; verdict: Verdict; reasons: string[]; reach: { reached: number; total: number } };

export type ClaimInput = { id: string; text: string; kind: "behavior_change" | "no_behavior_change" };

/** Run every approved claim's scenarios on the old and new build, then probes, then decide. */
export function verify(claims: ClaimInput[], build: Build): Report {
  const claimRuns: ClaimRun[] = claims.map((c) => {
    const scenarios = CLAIM_SCENARIOS.filter((s) => s.claim === c.id).map((s) => {
      const o = s.steps.map((st) => runStep(st, "old"));
      const h = s.steps.map((st) => runStep(st, build));
      const old = { status: o.at(-1)!.res.status, pass: o.every((x) => x.pass) };
      const head = { status: h.at(-1)!.res.status, pass: h.every((x) => x.pass) };
      const result = classifyClaimScenario(
        { status: old.pass ? "pass" : "fail", stable: true },
        { status: head.pass ? "pass" : "fail", stable: true },
      );
      return { scenario: s, old, head, result };
    });
    return { ...c, scenarios, result: rollupClaim({ id: c.id, kind: c.kind, results: scenarios.map((s) => s.result) }) };
  });

  const probes: ProbeRun[] = PROBE_SCENARIOS.map((s) => {
    const step = s.steps[0]!;
    const old = runStep(step, "old").res.status;
    const head = runStep(step, build).res.status;
    const changed = old !== head;
    const t = TRIAGE.get(s.id);
    // Triage was written for the correct fix; a changed probe nobody explained is "unknown".
    const explained = changed && t && build === "correct";
    return { scenario: s, old, head, changed, triage: changed ? (explained ? t!.triage : "unknown") : undefined, why: explained ? t!.why : undefined };
  });

  const reach = build === "noop" ? { reached: 0, total: 0 } : { reached: 4, total: 4 };
  const { verdict, reasons } = decide({
    claims: claimRuns.map((c) => ({ id: c.id, result: c.result })),
    probes: probes.map((p) => (p.triage ? { id: p.scenario.id, changed: p.changed, triage: p.triage as "explained" | "unknown" } : { id: p.scenario.id, changed: p.changed })),
    reach,
    minReach: 0.8,
  });
  return { claims: claimRuns, probes, verdict, reasons, reach };
}
