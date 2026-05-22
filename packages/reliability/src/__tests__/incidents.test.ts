import { describe, expect, it } from "vitest";
import { createReliabilityIncident } from "../incidents.js";

describe("reliability incidents", () => {
  it("creates a canonical reliability incident event", () => {
    const event = createReliabilityIncident({
      id: "incident-test-id",
      severity: "SEV2",
      title: "Webhook processing degraded",
      aggregateId: "webhooks",
      correlationId: "corr-test",
      source: "render.api"
    });

    expect(event.type).toBe("render.reliability.incident.opened");
    expect(event.version).toBe(1);
    expect(event.aggregateId).toBe("webhooks");
    expect(event.payload.severity).toBe("SEV2");
  });
});
