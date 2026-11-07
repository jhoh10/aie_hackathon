import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verification-first harness · Trust Issues" },
      { name: "description", content: "Engineers approve the claims, not the code. The agent isn't done until every claim is proven." },
      { property: "og:title", content: "Verification-first harness · Trust Issues" },
      { property: "og:description", content: "Agree on what must be true and how it's proven before an AI agent writes code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PHASES = [
  { k: "A", name: "Discuss the idea", lead: "Engineer", out: "Task brief: goal, inputs, outputs, out of scope", detail: "The engineer says what they want. The agent restates it as a brief and asks what is out of scope." },
  { k: "B", name: "Read the code, ask about testing", lead: "Agent", out: "Codebase findings + testing questions", detail: "The agent reads the code around the change and asks how this repo proves things: which tests exist, what runs in CI." },
  { k: "C", name: "Draft claims + checks", lead: "Agent", out: "Draft plan, no code", detail: "Each claim is one plain-language behaviour that must be true. Under each claim: the checks that will prove it, with their evidence strength." },
  { k: "D", name: "Confirm the plan", lead: "Engineer", out: "Approved claims", detail: "The one human gate. The engineer edits and approves the claims. Nothing gets built before this." },
  { k: "E", name: "Build and verify", lead: "Agent", out: "Code, green checks, verification report", detail: "The agent picks the design and loops until every check passes. The verifier runs each claim on the old and new code and gives a verdict." },
];

const BELIEFS = [
  ["Code is a black box", "Spend attention on inputs, outputs and how they're verified, not on every line."],
  ["The claims are the spec", "A list of checkable behaviours is easier to agree on than prose requirements."],
  ["Engineer owns claims, agent owns code", "Sign off once, on the plan. The agent iterates until it passes."],
  ["Proof, not promises", "The agent finishes with what ran and what passed, not “I implemented X”."],
];

function Index() {
  const [active, setActive] = useState(3);
  const p = PHASES[active]!;
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <section className="animate-rise py-14 sm:py-20">
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Verification-first harness</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Approve the claims, not the code.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            AI writes more code than anyone can read. So the engineer and the agent agree on what must be true, and how it will be proven, before any code is written.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/session">Run a live session <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/review">Open claims review</Link>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">How a session runs</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {PHASES.map((ph, i) => (
              <button
                key={ph.k}
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  i === active ? "border-ink bg-ink text-ink-foreground shadow-card" : "bg-card hover:border-muted-foreground",
                  ph.k === "D" && i !== active && "border-primary/50",
                )}
              >
                <span className="font-mono text-xs opacity-70">{ph.k}{ph.k === "D" && " · gate"}</span>
                <span className="mt-1 block text-sm leading-snug font-semibold">{ph.name}</span>
              </button>
            ))}
          </div>
          <div key={p.k} className="animate-rise mt-3 rounded-xl border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full px-2 py-0.5 font-semibold", p.lead === "Engineer" ? "bg-warn-soft text-warn" : "bg-accent text-accent-foreground")}>{p.lead} leads</span>
              <span className="text-muted-foreground">Output: {p.out}</span>
            </div>
            <p className="mt-2 text-[15px]">{p.detail}</p>
          </div>
        </section>

        <section className="mt-14 grid gap-3 sm:grid-cols-2">
          {BELIEFS.map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
