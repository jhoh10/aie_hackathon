import { describe, expect, it } from "vitest";
import { request, SUPERUSER_TOKEN, verify, type ClaimInput } from "./sim";

const claims: ClaimInput[] = [
  { id: "c1", text: "", kind: "behavior_change" },
  { id: "c2", text: "", kind: "no_behavior_change" },
  { id: "c3", text: "", kind: "no_behavior_change" },
];

describe("simulated PocketBase", () => {
  it("old build rejects a lowercase prefix, fixed build accepts it", () => {
    const h = `bearer ${SUPERUSER_TOKEN}`;
    expect(request("POST", "/api/collections/_superusers/auth-refresh", h, "old").status).toBe(401);
    expect(request("POST", "/api/collections/_superusers/auth-refresh", h, "correct").status).toBe(200);
  });
});

describe("verdict on h-bearer", () => {
  it("correct fix proves every claim and passes", () => {
    const r = verify(claims, "correct");
    expect(r.claims.map((c) => c.result)).toEqual(["proven", "proven", "proven"]);
    expect(r.verdict).toBe("PASS");
  });
  it("buggy fix breaks c3 and blocks", () => {
    const r = verify(claims, "buggy");
    expect(r.claims.find((c) => c.id === "c3")?.result).toBe("failed");
    expect(r.verdict).toBe("BLOCK");
  });
  it("unchanged code fails c1 and blocks", () => {
    expect(verify(claims, "noop").verdict).toBe("BLOCK");
  });
  it("a claim with no checks needs a human", () => {
    const r = verify([...claims, { id: "c9", text: "new", kind: "behavior_change" }], "correct");
    expect(r.verdict).toBe("NEEDS_HUMAN");
  });
});
