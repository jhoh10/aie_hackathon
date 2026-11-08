import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Lock, Play, Plus, RotateCcw, Trash2, X } from "lucide-react";
import planMd from "../../../upstream/verification-first-harness/examples/h-bearer/.verify/plan.md?raw";
import { parsePlanMd } from "@/lib/review/model";
import { BUILDS, CLAIM_SCENARIOS, PROBE_SCENARIOS, request, SUPERUSER_TOKEN, verify, type Build, type ClaimInput, type Report } from "@/lib/verify/sim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PLAN = parsePlanMd(planMd, "h-bearer");
const INITIAL: ClaimInput[] = PLAN.categories.flatMap((c) => c.claims.map((k) => ({ id: k.id, text: k.text, kind: k.kind })));
const STEPS = ["Brief", "Codebase", "Claims", "Gate", "Verify"] as const;

export function Session() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState(
    "Make the optional `Bearer` token prefix case-insensitive. Clients that send `bearer` or `BEARER` are currently refused.\n\nOut of scope: other auth schemes, token format.",
  );
  const [claims, setClaims] = useState<ClaimInput[]>(INITIAL);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);

  const editClaim = (id: string, patch: Partial<ClaimInput>) => {
    setClaims((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setApproved((s) => { const n = new Set(s); n.delete(id); return n; });
  };
  const reset = () => { setStep(0); setClaims(INITIAL); setApproved(new Set()); setLocked(false); };
  const canGo = (i: number) => i <= 2 || (i === 3 && claims.length > 0) || (i === 4 && locked);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">pocketbase/pocketbase · case h-bearer</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Run a session</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}><RotateCcw /> Start over</Button>
      </div>

      <ol className="mb-6 grid grid-cols-5 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              disabled={!canGo(i)}
              onClick={() => setStep(i)}
              className={cn(
                "w-full rounded-lg border px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                i === step ? "border-ink bg-ink text-ink-foreground" : i < step ? "bg-ok-soft text-ok" : "bg-card",
              )}
            >
              <span className="font-mono text-[11px] opacity-70">{String.fromCharCode(65 + i)}{i === 3 && " · gate"}</span>
              <span className="block truncate text-sm font-semibold">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div key={step} className="animate-rise">
        {step === 0 && (
          <Panel title="A. Discuss the idea" lead="Engineer" next={() => setStep(1)}>
            <p className="mb-2 text-sm text-muted-foreground">The task brief the engineer and agent agree on. Edit it freely.</p>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} className="bg-background" />
          </Panel>
        )}

        {step === 1 && (
          <Panel title="B. Read the code, ask about testing" lead="Agent" next={() => setStep(2)}>
            <ul className="space-y-2 text-sm">
              <Finding k="Found">Auth middleware strips the prefix with an exact, case-sensitive match on <code>Bearer </code>.</Finding>
              <Finding k="Found">Two endpoints read the header: <code>auth-refresh</code> and the superuser-only records list.</Finding>
              <Finding k="Asks">Prove it from outside over HTTP, or with a unit test of the parser?</Finding>
              <Finding k="Engineer">From outside. The verifier runs each check on the old and new build in Docker.</Finding>
            </ul>
            <h3 className="mt-5 mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Considered and skipped</h3>
            {PLAN.skipped.map(([a, b]) => (
              <p key={a} className="text-sm"><span className="font-semibold">{a}:</span> <span className="text-muted-foreground">{b}</span></p>
            ))}
          </Panel>
        )}

        {step === 2 && (
          <Panel title="C. Draft claims and checks" lead="Agent" next={() => setStep(3)} nextLabel="Send to the engineer">
            <p className="mb-3 text-sm text-muted-foreground">Plain-language behaviours. Edit, add or remove. A claim with no checks can't be proven automatically.</p>
            <div className="space-y-2">
              {claims.map((c) => {
                const checks = CLAIM_SCENARIOS.filter((s) => s.claim === c.id).length;
                return (
                  <div key={c.id} className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono">{c.id}</span>
                      <button
                        onClick={() => editClaim(c.id, { kind: c.kind === "behavior_change" ? "no_behavior_change" : "behavior_change" })}
                        className={cn("rounded-full px-2 py-0.5 font-semibold", c.kind === "behavior_change" ? "bg-ok-soft text-ok" : "bg-muted text-muted-foreground")}
                      >
                        {c.kind === "behavior_change" ? "changes behaviour" : "must not change"}
                      </button>
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", checks ? "bg-accent text-accent-foreground" : "bg-warn-soft text-warn")}>
                        {checks ? `${checks} HTTP checks` : "no checks yet"}
                      </span>
                      <button aria-label={`Remove ${c.id}`} className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => setClaims((cs) => cs.filter((x) => x.id !== c.id))}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <Textarea value={c.text} onChange={(e) => editClaim(c.id, { text: e.target.value })} rows={2} className="min-h-0 bg-card" />
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                const n = Math.max(0, ...claims.map((c) => Number(c.id.slice(1)) || 0)) + 1;
                setClaims((cs) => [...cs, { id: `c${n}`, text: "The login page works on mobile.", kind: "behavior_change" }]);
              }}
            >
              <Plus /> Add claim
            </Button>
          </Panel>
        )}

        {step === 3 && (
          <Panel title="D. Confirm the plan" lead="Engineer" gate>
            <p className="mb-3 text-sm text-muted-foreground">The one human gate. Approve each claim, then lock the plan. The verifier gets these claims and nothing else.</p>
            <div className="divide-y rounded-lg border bg-background">
              {claims.map((c) => {
                const on = approved.has(c.id);
                return (
                  <div key={c.id} className={cn("flex gap-3 p-3", on && "bg-ok-soft/60")}>
                    <button
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Approve claim ${c.id}`}
                      disabled={locked}
                      onClick={() => setApproved((s) => { const n = new Set(s); if (on) n.delete(c.id); else n.add(c.id); return n; })}
                      className={cn("grid size-7 shrink-0 place-items-center rounded-md border-2", on ? "border-ok bg-ok text-primary-foreground" : "border-muted-foreground/60 bg-card")}
                    >
                      {on && <Check className="animate-pop size-4" strokeWidth={3} />}
                    </button>
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{c.id} · {c.kind === "behavior_change" ? "changes behaviour" : "must not change"}</span>
                      <p className="font-medium">{c.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{locked ? "Locked. The agent can build." : `${approved.size} of ${claims.length} approved`}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={locked} onClick={() => setStep(2)}>Edit claims</Button>
                <Button
                  disabled={locked || approved.size !== claims.length}
                  onClick={() => { setLocked(true); toast.success("Plan approved and locked"); setStep(4); }}
                >
                  <Lock /> Approve claims
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {step === 4 && <VerifyStep claims={claims} />}
      </div>
    </main>
  );
}

function Panel({ title, lead, children, next, nextLabel = "Continue", gate }: { title: string; lead: string; children: React.ReactNode; next?: () => void; nextLabel?: string; gate?: boolean }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-card", gate && "border-primary/40")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", lead === "Engineer" ? "bg-warn-soft text-warn" : "bg-accent text-accent-foreground")}>{lead} leads</span>
      </div>
      {children}
      {next && (
        <div className="mt-5 flex justify-end">
          <Button onClick={next}>{nextLabel} <ChevronRight /></Button>
        </div>
      )}
    </section>
  );
}

function Finding({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-20 shrink-0 font-mono text-xs leading-6 text-muted-foreground">{k}</span>
      <span>{children}</span>
    </li>
  );
}

const RESULT_STYLE: Record<string, string> = {
  proven: "bg-ok-soft text-ok",
  not_distinguishing: "bg-ok-soft text-ok",
  failed: "bg-sec-soft text-sec",
  unproven: "bg-warn-soft text-warn",
  inconclusive: "bg-warn-soft text-warn",
};
const RESULT_LABEL: Record<string, string> = { proven: "proven", not_distinguishing: "unchanged ✓", failed: "failed", unproven: "unproven", inconclusive: "inconclusive" };
const VERDICT_STYLE = { PASS: "bg-ok text-primary-foreground", BLOCK: "bg-sec text-primary-foreground", NEEDS_HUMAN: "bg-warn text-primary-foreground" };

function VerifyStep({ claims }: { claims: ClaimInput[] }) {
  const [build, setBuild] = useState<Build>("correct");
  const [report, setReport] = useState<Report | null>(null);
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = report ? report.claims.reduce((n, c) => n + Math.max(1, c.scenarios.length), 0) + report.probes.length + 1 : 0;
  const running = !!report && shown < total;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const run = () => {
    if (timer.current) clearInterval(timer.current);
    const r = verify(claims, build);
    setReport(r);
    setShown(0);
    timer.current = setInterval(() => setShown((s) => s + 1), 180);
  };
  useEffect(() => { if (!running && timer.current) { clearInterval(timer.current); timer.current = null; } }, [running]);

  let idx = 0;
  const visible = () => idx++ < shown;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">E. Build and verify</h2>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">Agent leads</span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Pick what the agent shipped, then run the verifier: every check runs on the old and new build, then probes look for behaviour nobody declared.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(BUILDS) as Build[]).map((b) => (
            <button
              key={b}
              aria-pressed={build === b}
              onClick={() => { setBuild(b); setReport(null); }}
              className={cn("rounded-lg border p-3 text-left transition-colors", build === b ? "border-ink bg-ink text-ink-foreground" : "bg-background hover:border-muted-foreground")}
            >
              <span className="block text-sm font-semibold">{BUILDS[b].label}</span>
              <span className="block text-xs opacity-75">{BUILDS[b].note}</span>
            </button>
          ))}
        </div>
        <Button className="mt-4" onClick={run} disabled={running}>
          <Play /> {report ? "Run again" : "Run verifier"}
        </Button>
      </section>

      {report && (
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Claims · old build → new build</h3>
          <div className="space-y-3">
            {report.claims.map((c) => {
              const rows = c.scenarios.length ? c.scenarios : [null];
              const showClaim = rows.every(() => true);
              const rowVis = rows.map(() => visible());
              if (!showClaim || !rowVis[0]) return null;
              const complete = rowVis.every(Boolean);
              return (
                <div key={c.id} className="animate-rise rounded-lg border bg-background">
                  <div className="flex items-start gap-3 border-b p-3">
                    <span className="font-mono text-xs leading-6 text-muted-foreground">{c.id}</span>
                    <p className="flex-1 text-sm font-medium">{c.text}</p>
                    {complete && <span className={cn("animate-pop rounded-full px-2 py-0.5 text-xs font-bold", RESULT_STYLE[c.result])}>{c.result}</span>}
                  </div>
                  {rows.map((s, i) =>
                    !rowVis[i] ? null : s ? (
                      <div key={s.scenario.id} className="animate-rise grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-1.5 font-mono text-xs">
                        <span className="truncate" title={s.scenario.steps[0]?.headers?.["Authorization"]}>
                          {s.scenario.steps[0]?.method} · <span className="text-muted-foreground">{s.scenario.steps[0]?.headers?.["Authorization"]?.replace("{{superuser_token}}", "‹token›")}</span>
                        </span>
                        <Status code={s.old.status} pass={s.old.pass} />
                        <Status code={s.head.status} pass={s.head.pass} />
                        <span className={cn("rounded-full px-2 py-px font-sans font-semibold", RESULT_STYLE[s.result])}>{RESULT_LABEL[s.result]}</span>
                      </div>
                    ) : (
                      <p key="none" className="px-3 py-2 text-xs text-warn">No checks: the verifier can't prove this claim.</p>
                    ),
                  )}
                </div>
              );
            })}
          </div>

          {report.probes.some(() => idx < shown) && (
            <>
              <h3 className="mt-6 mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Probes · behaviour nobody claimed</h3>
              <div className="divide-y rounded-lg border bg-background">
                {report.probes.map((p) =>
                  !visible() ? null : (
                    <div key={p.scenario.id} className="animate-rise grid grid-cols-[1fr_auto] gap-x-3 px-3 py-1.5 text-xs">
                      <span className="truncate font-mono">
                        {p.scenario.steps[0]?.headers?.["Authorization"]?.replace("{{superuser_token}}", "‹token›")}
                        <span className="text-muted-foreground"> · {p.old} → {p.head}</span>
                      </span>
                      <span className={cn("rounded-full px-2 py-px font-semibold", !p.changed ? "bg-muted text-muted-foreground" : p.triage === "explained" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
                        {!p.changed ? "unchanged" : p.triage === "explained" ? "changed · explained" : "changed · unexplained"}
                      </span>
                      {p.why && <span className="col-span-2 text-muted-foreground">{p.why}</span>}
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          {visible() && (
            <div className="animate-rise mt-6 flex flex-wrap items-center gap-4 rounded-xl border p-4">
              <span className={cn("animate-pop rounded-lg px-4 py-2 font-mono text-xl font-bold", VERDICT_STYLE[report.verdict])}>{report.verdict}</span>
              <div className="flex-1 text-sm">
                {report.reasons.length ? (
                  <ul className="space-y-0.5">{report.reasons.map((r) => <li key={r} className="flex gap-1.5"><X className="mt-0.5 size-4 shrink-0 text-sec" />{r}</li>)}</ul>
                ) : (
                  <p>Every approved claim is proven and every behaviour change is explained. Changed lines reached: {report.reach.reached}/{report.reach.total}.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <Playground build={build} />
      <p className="text-xs text-muted-foreground">
        Simulated in the browser from the repo's real h-bearer checks ({CLAIM_SCENARIOS.length} claim checks, {PROBE_SCENARIOS.length} probes) and the verifier's own verdict rules. The real run uses Docker.
      </p>
    </div>
  );
}

function Status({ code, pass }: { code: number; pass: boolean }) {
  return <span className={cn("w-12 rounded px-1.5 py-px text-center font-semibold", pass ? "bg-ok-soft text-ok" : "bg-sec-soft text-sec")}>{code}</span>;
}

function Playground({ build }: { build: Build }) {
  const [header, setHeader] = useState("bEaReR ‹token›");
  const real = header.replace("‹token›", SUPERUSER_TOKEN);
  const path = "/api/collections/_superusers/auth-refresh";
  const old = request("POST", path, real || undefined, "old");
  const head = request("POST", path, real || undefined, build);
  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <h3 className="font-semibold">Try a request yourself</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        <code>POST {path}</code>. Use <code>‹token›</code> for the valid superuser token, or type a fake one.
      </p>
      <Input value={header} onChange={(e) => setHeader(e.target.value)} className="bg-background font-mono" aria-label="Authorization header" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[["Old build", old], [BUILDS[build].label, head]].map(([label, r]) => {
          const res = r as { status: number };
          return (
            <div key={label as string} className="rounded-lg border bg-background p-3">
              <span className="text-xs text-muted-foreground">{label as string}</span>
              <p className={cn("font-mono text-2xl font-bold", res.status === 200 ? "text-ok" : "text-sec")}>{res.status}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
