import { describe, expect, it } from "vitest";
import md from "../../../upstream/verification-first-harness/examples/h-bearer/.verify/plan.md?raw";
import { BUILT_IN_PLANS, claimsJson, guessStrength, parsePlanMd } from "./model";

describe("plan.md import", () => {
  const plan = parsePlanMd(md, "h-bearer");

  it("reads all three h-bearer claims with kinds", () => {
    const claims = plan.categories.flatMap((c) => c.claims);
    expect(claims.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(claims.map((c) => c.kind)).toEqual(["behavior_change", "no_behavior_change", "no_behavior_change"]);
  });

  it("attaches one check to each claim and keeps skipped rows", () => {
    expect(plan.categories.flatMap((c) => c.claims).every((c) => c.evidence.length === 1)).toBe(true);
    expect(plan.skipped.map((s) => s[0])).toEqual(["Unit test of the header parser", "Performance"]);
  });

  it("exports the contract with the group name", () => {
    const json = JSON.parse(claimsJson(plan));
    expect(json.claims[0]).toMatchObject({ id: "c1", group: "Auth header" });
  });

  it("rejects text without a claims table", () => {
    expect(() => parsePlanMd("# Plan\nnothing")).toThrow();
  });
});

describe("strength guess", () => {
  it("ranks Lean as proof and fuzzing as generated", () => {
    expect(guessStrength("Lean 4", "theorem")).toBe("proof");
    expect(guessStrength("Property-based", "")).toBe("generated");
  });
});

it("ships the four built-in use cases", () => {
  expect(BUILT_IN_PLANS.map((p) => p.id)).toEqual(["bugfix", "feature", "refactor", "formal"]);
});
