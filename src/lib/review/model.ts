import { CATEGORY, PLANS, STRENGTH } from "./data";

export type Strength = "proof" | "generated" | "failpass" | "example" | "static" | "observed";
export const STRENGTH_ORDER: Strength[] = ["proof", "generated", "failpass", "example", "static", "observed"];
export const STRENGTHS = STRENGTH as Record<Strength, { label: string; tip: string }>;

export type Evidence = { type: string; s: Strength; what?: string; code?: string };
export type Claim = {
  id: string;
  kind: "behavior_change" | "no_behavior_change";
  text: string;
  evidence: Evidence[];
  refs?: string[];
  sec?: boolean;
  amended?: boolean;
};
export type Category = {
  key: string;
  tone: string; // colour family: intent | boundaries | formal | safety | conformance | preserved | other
  name: string;
  note: string;
  routine?: boolean;
  open: boolean;
  claims: Claim[];
};
export type Plan = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  why: string; // may contain <b>
  categories: Category[];
  skipped: [string, string][];
};

type RawCat = { cat: string; open?: boolean; routine?: boolean; claims: Claim[] };
type RawPlan = Omit<Plan, "id" | "categories"> & { categories: RawCat[] };

export const BUILT_IN_PLANS: Plan[] = Object.entries(PLANS as Record<string, RawPlan>).map(([id, p]) => ({
  ...p,
  id,
  categories: p.categories.map((c) => ({
    key: c.cat,
    tone: c.cat,
    name: CATEGORY[c.cat].name,
    note: CATEGORY[c.cat].note,
    routine: c.routine,
    open: c.open ?? false,
    claims: c.claims,
  })),
}));

export const allClaims = (p: Plan) => p.categories.flatMap((c) => c.claims.map((k) => ({ ...k, cat: c })));

export const strongest = (k: Claim): Strength =>
  [...k.evidence].map((e) => e.s).sort((a, b) => STRENGTH_ORDER.indexOf(a) - STRENGTH_ORDER.indexOf(b))[0] ?? "observed";

/** Claims JSON per verifier/docs/claims-contract.md (group = category name). */
export const claimsJson = (p: Plan) =>
  JSON.stringify(
    { claims: allClaims(p).map((k) => ({ id: k.id, text: k.text, kind: k.kind, group: k.cat.name })) },
    null,
    2,
  );

// ---------- .verify/plan.md parser ----------

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function tableAfter(md: string, heading: RegExp): string[][] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return [];
  const rows: string[][] = [];
  let seenHeader = false;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,6}\s/.test(l)) break;
    if (!l.trim().startsWith("|")) {
      if (rows.length || seenHeader) break;
      continue;
    }
    if (/^\|\s*:?-{2,}/.test(l.trim())) continue;
    if (!seenHeader) {
      seenHeader = true;
      continue;
    }
    rows.push(cells(l));
  }
  return rows;
}

/** Guess evidence strength from a check's type and description. */
export function guessStrength(type: string, what: string): Strength {
  const t = `${type} ${what}`.toLowerCase();
  if (/\blean\b|proof|proved|theorem/.test(t)) return "proof";
  if (/property|fuzz|differential|hypothesis|generated/.test(t)) return "generated";
  if (/fails (on|before)|old (code|commit)|regression test/.test(t)) return "failpass";
  if (/lint|type ?check|static|import rule|dependency/.test(t)) return "static";
  if (/screenshot|manual|log scan|observed/.test(t)) return "observed";
  return "example";
}

const toneFor = (group: string, kind: string) => {
  const g = group.toLowerCase();
  if (/secur|safety|privacy|auth/.test(g) && kind !== "no_behavior_change") return "safety";
  if (kind === "no_behavior_change") return "preserved";
  return "intent";
};

export function parsePlanMd(md: string, id = "imported"): Plan {
  const rawTitle = (md.match(/^#\s+(?:Plan:\s*)?(.+)$/m)?.[1] ?? "Imported plan").replace(/`/g, "");
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  const status = md.match(/^Status:\s*(.+)$/m)?.[1];
  const request = md.match(/^Request[^:]*:\s*(.+)$/m)?.[1];

  const claimRows = tableAfter(md, /^#{2,}\s*Claims\b/i);
  if (!claimRows.length) throw new Error("No claims table found under a “## Claims” heading.");
  const checkRows = tableAfter(md, /^#{2,}\s*Checks\b/i);
  const skipRows = tableAfter(md, /^#{2,}\s*Considered and skipped\b/i);

  const evidenceBy = new Map<string, Evidence[]>();
  for (const [claim, type = "Check", what = ""] of checkRows) {
    for (const cid of claim.split(/[,\s]+/).filter(Boolean)) {
      const list = evidenceBy.get(cid) ?? [];
      list.push({ type, what: what.replace(/`/g, ""), s: guessStrength(type, what) });
      evidenceBy.set(cid, list);
    }
  }

  const groups = new Map<string, Category>();
  for (const [cid = "", text = "", kindRaw = "behavior_change", group = "Claims"] of claimRows) {
    if (!cid) continue;
    const kind = kindRaw.includes("no_behavior") ? "no_behavior_change" : "behavior_change";
    const name = group || "Claims";
    let cat = groups.get(name);
    if (!cat) {
      cat = { key: `g-${groups.size}`, tone: toneFor(name, kind), name, note: "From plan.md", open: true, claims: [] };
      groups.set(name, cat);
    }
    cat.claims.push({ id: cid, kind, text: text.replace(/`/g, ""), evidence: evidenceBy.get(cid) ?? [] });
  }

  return {
    id,
    label: "Imported",
    eyebrow: `.verify/plan.md${status ? ` · ${status}` : ""}`,
    title,
    why: request ? `<b>Request:</b> ${escapeHtml(request.replace(/`/g, ""))}` : "<b>Imported plan:</b> review each claim before the agent builds.",
    categories: [...groups.values()],
    skipped: skipRows.filter((r) => r.length >= 2).map((r) => [r[0], r[1]] as [string, string]),
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
