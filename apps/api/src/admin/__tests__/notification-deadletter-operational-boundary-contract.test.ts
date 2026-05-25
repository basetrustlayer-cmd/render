import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification deadletter operational boundary contract", () => {
  const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const replayWorkerGovernanceTest = readFileSync(
    resolve(process.cwd(), "src/admin/__tests__/notification-replay-worker-governance-contract.test.ts"),
    "utf8"
  );
  const deadletterWorkerContractTest = readFileSync(
    resolve(process.cwd(), "src/notifications/__tests__/deadletter-worker-contract.test.ts"),
    "utf8"
  );

  it("keeps admin routes as replay request/control surfaces only", () => {
    expect(adminRoutes).toContain("RENDER_QUEUE_NAMES.notificationDeadLetter");
    expect(adminRoutes).toContain("RENDER_QUEUE_NAMES.notificationReplayRequest");
    expect(adminRoutes).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");

    expect(adminRoutes).not.toContain("new Worker(");
    expect(adminRoutes).not.toContain(".process(");
    expect(adminRoutes).not.toContain("deliverNotification(");
  });

  it("keeps replay execution covered by worker governance contracts", () => {
    expect(replayWorkerGovernanceTest).toContain("notificationReplayRequest");
    expect(replayWorkerGovernanceTest).toContain("manualApproval");
    expect(replayWorkerGovernanceTest).toContain("automaticReplay");

    expect(deadletterWorkerContractTest).toContain("notificationDeadLetter");
    expect(deadletterWorkerContractTest).toContain("dead-letter");
  });

  it("prevents admin routes from directly mutating delivery execution state", () => {
    expect(adminRoutes).not.toContain("status: \"DELIVERED\"");
    expect(adminRoutes).not.toContain("status: \"RETRYING\"");
    expect(adminRoutes).not.toContain("attemptCount +=");
  });
});
