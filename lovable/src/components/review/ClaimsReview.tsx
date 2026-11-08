import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import hBearerMd from "../../../upstream/verification-first-harness/examples/h-bearer/.verify/plan.md?raw";
import {
  BUILT_IN_PLANS,
  STRENGTHS,
  STRENGTH_ORDER,
  allClaims,
  claimsJson,
  parsePlanMd,
  strongest,
  type Claim,
  type Plan,
  type Strength,
} from "@/lib/review/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronRight, Copy, Download, FileUp, Lock, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Review = { approved: string[]; open: Record<string, boolean>; locked: boolean };

const H_BEARER: Plan = { ...parsePlanMd(hBearerMd, "h-bearer"), label: "PocketBase · h-bearer" };
const STORE = "vf-review-v1";
const POLICY = "vf-auto-approve-regression";

const TONE: Record<string, string> = {
  formal: "border-l-lean",
  model: "border-l-lean",
  safety: "border-l-sec",
  conformance: "border-l-primary",
  intent: "border-l-ok",
  boundaries: "border-l-warn",
  preserved: "border-l-muted-foreground",
};

const STRENGTH_CHIP: Record<Strength, string> = {
  proof: "bg-lean-soft text-lean",
  generated: "bg-ok-soft text-ok",
  failpass: "bg-accent text-accent-foreground",
  example: "bg-muted text-muted-foreground",
  static: "bg-muted text-muted-foreground",
  observed: "bg-warn-soft text-warn",
};

function Chip({ s, dim }: { s: Strength; dim?: boolean }) {
  return (
    <span
      title={STRENGTHS[s].tip}
      className={cn("rounded-full px-2 py-px text-[11.5px] font-semibold whitespace-nowrap", STRENGTH_CHIP[s], dim && "opacity-40")}
    >
      {STRENGTHS[s].label}
    </span>
  );
}

function fresh(p: Plan, policy: boolean): Review {
  return {
    approved: policy ? p.categories.filter((c) => c.routine).flatMap((c) => c.claims.map((k) => k.id)) : [],
    open: Object.fromEntries(p.categories.map((c) => [c.key, c.open])),
    locked: false,
  };
}

export function ClaimsReview() {
  const [imported, setImported] = useState<Plan | null>(null);
  const plans = useMemo(() => [H_BEARER, ...BUILT_IN_PLANS, ...(imported ? [imported] : [])], [imported]);
  const [planId, setPlanId] = useState(H_BEARER.id);
  const [policy, setPolicy] = useState(false);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [evOpen, setEvOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [minStrength, setMinStrength] = useState<Strength | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lockedRef = useRef<HTMLElement>(null);

  // Restore after hydration so server and client render the same first frame.
  useEffect(() => {
    try {
      setPolicy(localStorage.getItem(POLICY) === "1");
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.reviews) setReviews(saved.reviews);
      if (saved?.imported) setImported(saved.imported);
      if (saved?.planId) setPlanId(saved.planId);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE, JSON.stringify({ reviews, imported, planId }));
    localStorage.setItem(POLICY, policy ? "1" : "0");
  }, [reviews, imported, planId, policy, hydrated]);

  const plan: Plan = plans.find((p) => p.id === planId) ?? H_BEARER;
  const r = reviews[plan.id] ?? fresh(plan, policy);
  const approved = new Set(r.approved);
  const claims = allClaims(plan);
  const done = claims.filter((k) => approved.has(k.id)).length;
  const total = claims.length;
  const ready = done === total && total > 0;
  const nChecks = claims.reduce((n, k) => n + k.evidence.length, 0);
  const routine = claims.filter((k) => k.cat.routine);

  const update = (fn: (r: Review) => Review) => setReviews((all) => ({ ...all, [plan.id]: fn(all[plan.id] ?? fresh(plan, policy)) }));
  const toggle = (ids: string[], on: boolean) =>
    update((r) => {
      const s = new Set(r.approved);
      ids.forEach((id) => (on ? s.add(id) : s.delete(id)));
      return { ...r, approved: [...s] };
    });

  const matches = (k: Claim) => {
    const q = query.trim().toLowerCase();
    const textOk = !q || `${k.id} ${k.text} ${k.evidence.map((e) => `${e.type} ${e.what ?? ""}`).join(" ")}`.toLowerCase().includes(q);
    const sOk = !minStrength || STRENGTH_ORDER.indexOf(strongest(k)) <= STRENGTH_ORDER.indexOf(minStrength);
    return textOk && sOk;
  };
  const filtering = !!query.trim() || !!minStrength;

  const setPolicyAll = (v: boolean) => {
    setPolicy(v);
    setReviews((all) => {
      const next = { ...all };
      for (const p of plans) {
        const cur = next[p.id] ?? fresh(p, !v);
        if (cur.locked) continue;
        const s = new Set(cur.approved);
        p.categories.filter((c) => c.routine).forEach((c) => c.claims.forEach((k) => (v ? s.add(k.id) : s.delete(k.id))));
        next[p.id] = { ...cur, approved: [...s] };
      }
      return next;
    });
  };

  const json = claimsJson(plan);
  const copy = async () => {
    await navigator.clipboard?.writeText(json);
    toast.success("Claims JSON copied");
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = "claims.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Trust Issues · verification-first</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Claims review</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Agree on what must be true, and how it will be proven, before the agent writes a line.
            </p>
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp /> Load plan.md
          </Button>
        </div>

        <nav role="tablist" aria-label="Plan" className="mb-6 flex flex-wrap gap-1.5">
          {plans.map((p) => {
            const rv = reviews[p.id];
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === plan.id}
                onClick={() => setPlanId(p.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  p.id === plan.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {rv?.locked && <Lock className="size-3" />}
                {p.label}
              </button>
            );
          })}
        </nav>

        <header key={plan.id} className="animate-rise mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{plan.eyebrow}</p>
            <h2 className="mt-1 text-2xl leading-tight font-semibold">{plan.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} claims in {plan.categories.length} categories · {nChecks} checks
            </p>
          </div>
          <span
            role="status"
            className={cn("rounded-full px-3 py-1.5 text-xs font-bold", r.locked ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}
          >
            {r.locked ? "Approved & locked" : "Awaiting review"}
          </span>
        </header>

        <div
          className="mb-4 rounded-xl bg-accent px-4 py-3 text-sm [&_b]:text-accent-foreground"
          dangerouslySetInnerHTML={{ __html: plan.why }}
        />

        <section aria-label="Progress" className="mb-4 rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-medium">
              {done} of {total} claims approved
            </span>
            <span className="text-muted-foreground">
              {!routine.length
                ? "No routine claims: review every one"
                : policy
                  ? "Routine regression: auto-approved by repo policy"
                  : `Routine regression: ${routine.filter((k) => approved.has(k.id)).length}/${routine.length}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-ok transition-all duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={policy} onCheckedChange={setPolicyAll} disabled={r.locked} />
            Auto-approve routine regression claims on future PRs in this repo
          </label>
        </section>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search claims and checks" className="bg-card pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>At least:</span>
            {STRENGTH_ORDER.map((s) => (
              <button key={s} onClick={() => setMinStrength(minStrength === s ? null : s)} aria-pressed={minStrength === s}>
                <Chip s={s} dim={!!minStrength && STRENGTH_ORDER.indexOf(s) > STRENGTH_ORDER.indexOf(minStrength)} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {plan.categories.map((c) => {
            const visible = c.claims.filter(matches);
            if (filtering && !visible.length) return null;
            const ok = c.claims.filter((k) => approved.has(k.id)).length;
            const all = ok === c.claims.length;
            const open = filtering || r.open[c.key];
            return (
              <section
                key={c.key}
                className={cn("overflow-hidden rounded-xl border border-l-4 bg-card shadow-card", TONE[c.tone] ?? "border-l-border", c.routine && "border-dashed")}
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    aria-expanded={open}
                    onClick={() => update((r) => ({ ...r, open: { ...r.open, [c.key]: !r.open[c.key] } }))}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <ChevronRight className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
                    <span>
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block text-[13px] text-muted-foreground">
                        {c.note}
                        {c.routine && " · routine, collapsed by default"}
                      </span>
                    </span>
                  </button>
                  <span className={cn("font-mono text-xs", all ? "font-bold text-ok" : "text-muted-foreground")}>
                    {ok}/{c.claims.length}
                  </span>
                  <Button size="sm" variant="outline" disabled={r.locked} onClick={() => toggle(c.claims.map((k) => k.id), !all)}>
                    {all ? "Clear all" : "Approve all"}
                  </Button>
                </div>
                {open && (
                  <div className="border-t">
                    {visible.map((k) => {
                      const on = approved.has(k.id);
                      const ev = evOpen.has(k.id);
                      return (
                        <div key={k.id} className={cn("grid grid-cols-[auto_1fr] gap-3 border-b px-4 py-3 last:border-b-0 transition-colors", on && "bg-ok-soft/60")}>
                          <button
                            role="checkbox"
                            aria-checked={on}
                            aria-label={`Approve claim ${k.id}`}
                            disabled={r.locked}
                            onClick={() => toggle([k.id], !on)}
                            className={cn(
                              "mt-0.5 grid size-7 place-items-center rounded-md border-2 transition-colors disabled:cursor-not-allowed",
                              on ? "border-ok bg-ok text-primary-foreground" : "border-muted-foreground/60 bg-card hover:border-ok",
                            )}
                          >
                            {on && <Check className="animate-pop size-4" strokeWidth={3} />}
                          </button>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{k.id}</span>
                              <Chip s={strongest(k)} />
                              {k.refs?.map((ref) => (
                                <span key={ref} className={cn("rounded-full px-2 py-px text-[11.5px] font-semibold", k.sec ? "bg-sec-soft text-sec" : "bg-accent text-accent-foreground")}>
                                  {ref}
                                </span>
                              ))}
                              {k.kind === "no_behavior_change" && <span className="rounded-full bg-muted px-2 py-px text-[11.5px] font-semibold">must not change</span>}
                              {k.amended && <span className="rounded-full bg-warn-soft px-2 py-px text-[11.5px] font-semibold text-warn">amended by engineer</span>}
                            </div>
                            <p className="font-medium">{k.text}</p>
                            {k.evidence.length > 0 && (
                              <button
                                aria-expanded={ev}
                                onClick={() => setEvOpen((s) => { const n = new Set(s); if (n.has(k.id)) n.delete(k.id); else n.add(k.id); return n; })}
                                className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary"
                              >
                                <ChevronRight className={cn("size-3.5 transition-transform", ev && "rotate-90")} />
                                Evidence · {k.evidence.length} {k.evidence.length === 1 ? "check" : "checks"}
                              </button>
                            )}
                            {ev && (
                              <ul className="animate-rise mt-2 space-y-2.5 border-l-2 pl-3">
                                {k.evidence.map((e, i) => (
                                  <li key={i} className="text-[13.5px]">
                                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold">{e.type}</span>
                                      <Chip s={e.s} />
                                    </div>
                                    {e.code ? (
                                      <pre className="overflow-auto rounded-lg bg-muted p-2.5 font-mono text-xs leading-relaxed">{e.code}</pre>
                                    ) : (
                                      <span className="text-muted-foreground">{e.what}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
          {filtering && !claims.some(matches) && <p className="py-8 text-center text-sm text-muted-foreground">No claims match.</p>}
        </div>

        {plan.skipped.length > 0 && (
          <>
            <h3 className="mt-8 mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Considered and skipped</h3>
            <div className="divide-y rounded-xl border bg-card px-4 shadow-card">
              {plan.skipped.map(([c, why]) => (
                <div key={c} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[34%_1fr]">
                  <span className="font-semibold">{c}</span>
                  <span className="text-muted-foreground">{why}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {r.locked && (
          <section ref={lockedRef} className="animate-rise mt-6 rounded-xl border bg-card p-4 shadow-card">
            <h3 className="font-semibold">Approved claims, handed to the verifier</h3>
            <p className="text-sm text-muted-foreground">Locked for this PR. Editing a claim now needs a new approval.</p>
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{json}</pre>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}><Copy /> Copy JSON</Button>
              <Button variant="outline" size="sm" onClick={download}><Download /> Download claims.json</Button>
            </div>
          </section>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-sm text-muted-foreground">
            {r.locked
              ? "Claims approved and locked. The agent can start building."
              : ready
                ? "Every claim approved. Approve to lock them for this PR."
                : `${total - done} claim${total - done === 1 ? "" : "s"} left to approve`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReviews((a) => ({ ...a, [plan.id]: fresh(plan, policy) }))}>
              <RotateCcw /> Reset
            </Button>
            <Button
              disabled={!ready || r.locked}
              onClick={() => {
                update((r) => ({ ...r, locked: true }));
                setTimeout(() => lockedRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
              }}
            >
              <Lock /> Approve claims
            </Button>
          </div>
        </div>
      </footer>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onLoad={(p) => {
          setImported(p);
          setReviews((a) => { const n = { ...a }; delete n[p.id]; return n; });
          setPlanId(p.id);
          setImportOpen(false);
          toast.success(`Loaded ${allClaims(p).length} claims`);
        }}
      />
    </div>
  );
}

function ImportDialog({ open, onOpenChange, onLoad }: { open: boolean; onOpenChange: (v: boolean) => void; onLoad: (p: Plan) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = (md: string) => {
    try {
      onLoad(parsePlanMd(md));
      setText("");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load a .verify/plan.md</DialogTitle>
          <DialogDescription>Paste the plan the agent wrote, or pick the file. Claims, checks and skipped items are read from its tables.</DialogDescription>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="font-mono text-xs" placeholder={"# Plan: …\n\n## Claims\n\n| # | Claim | Kind | Group | Blocks done? |\n| --- | --- | --- | --- | --- |\n| c1 | … | behavior_change | … | Yes |"} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <FileUp /> Choose file
                <input type="file" accept=".md,text/markdown,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ""; }} />
              </label>
            </Button>
            <Button variant="ghost" onClick={() => setText(hBearerMd)}>Use example</Button>
          </div>
          <Button disabled={!text.trim()} onClick={() => load(text)}>Load claims</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
