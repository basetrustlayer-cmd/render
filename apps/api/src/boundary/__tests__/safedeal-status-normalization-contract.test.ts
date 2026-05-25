import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const helpers = readFileSync(resolve("src/webhooks/helpers.ts"), "utf8");
const routes = readFileSync(resolve("src/webhooks/routes.ts"), "utf8");

describe("SafeDeal status normalization contract", () => {
  it("normalizes only canonical TrustLayer escrow statuses", () => {
    expect(helpers).toContain("mapTrustLayerEscrowStatus");
    expect(helpers).toContain('if (status === "FUNDED") return "FUNDED"');
    expect(helpers).toContain('if (status === "DELIVERED") return "DELIVERED"');
    expect(helpers).toContain('if (status === "DISPUTED") return "DISPUTED"');
    expect(helpers).toContain('if (status === "CONFIRMED") return "CONFIRMED"');
    expect(helpers).toContain('if (status === "COMPLETE") return "COMPLETE"');
    expect(helpers).toContain('if (status === "REFUNDED") return "REFUNDED"');
    expect(helpers).toContain("return undefined");
  });

  it("does not write unmapped escrow status into SafeDeal projection cache", () => {
    expect(routes).toContain("const mappedStatus = mapTrustLayerEscrowStatus(escrowStatus)");
    expect(routes).toContain("if (mappedStatus)");
    expect(routes).toContain("escrowStatusCached: mappedStatus");
    expect(routes).not.toContain("escrowStatusCached: escrowStatus");
  });
});
