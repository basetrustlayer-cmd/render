import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin route privilege contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("keeps platform finance reconciliation restricted to super admins", () => {
    expect(source).toContain(
      'app.get("/admin/finance/reconciliation", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps audit logs restricted to super admins", () => {
    expect(source).toContain(
      'app.get("/admin/audit-logs", { preHandler: [authenticate, requireSuperAdmin] }'
    );
  });

  it("keeps user suspension operations restricted to admins", () => {
    expect(source).toContain(
      'app.post("/admin/users/:id/suspend", { preHandler: [authenticate, requireAdmin] }'
    );
    expect(source).toContain(
      'app.post("/admin/users/:id/unsuspend", { preHandler: [authenticate, requireAdmin] }'
    );
  });

  it("keeps listing moderation restricted to moderators or higher", () => {
    expect(source).toContain(
      'app.get("/admin/listings/pending", { preHandler: [authenticate, requireModerator] }'
    );
    expect(source).toContain(
      'app.post("/admin/listings/:id/approve", { preHandler: [authenticate, requireModerator] }'
    );
    expect(source).toContain(
      'app.post("/admin/listings/:id/reject", { preHandler: [authenticate, requireModerator] }'
    );
  });

  it("keeps dispute operations restricted to moderators or higher", () => {
    const disputeRoutes = [
      "/admin/disputes",
      "/admin/disputes/:id",
      "/admin/disputes/:id/note",
      "/admin/disputes/:id/status",
      "/admin/disputes/:id/resolve/buyer-refund",
      "/admin/disputes/:id/resolve/seller-release"
    ];

    for (const route of disputeRoutes) {
      expect(source).toContain(route);
    }

    expect(source.match(/requireModerator/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it("uses organization scope helper across tenant-sensitive admin routes", () => {
    expect(source.match(/requireAdminOrganizationScope\(request, reply\)/g)?.length).toBe(10);
  });
  it("keeps webhook event reconciliation read model restricted to super admins", () => {
    expect(source).toContain('app.get("/admin/webhooks/events", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(source).toContain("webhookEventListQuerySchema");
    expect(source).toContain("prisma.webhookEvent.findMany");
    expect(source).toContain("eventId: true");
    expect(source).toContain("processedAt: true");
  });

  it("exposes webhook failure recovery fields in the reconciliation read model", () => {
    expect(source).toContain("failedOnly: z.coerce.boolean().optional()");
    expect(source).toContain('query.data.failedOnly ? { status: "FAILED" }');
    expect(source).toContain("payload: true");
    expect(source).toContain("eventType: true");
  });
  it("keeps webhook replay execution controls manual and super-admin restricted", () => {
    expect(source).toContain('app.post("/admin/webhooks/events/:id/replay-request", { preHandler: [authenticate, requireSuperAdmin] }');
    expect(source).toContain('event.status !== "FAILED"');
    expect(source).toContain("WEBHOOK_EVENT_REPLAY_REVIEW_REQUESTED");
    expect(source).toContain("createRenderQueue(RENDER_QUEUE_NAMES.webhookReplayRequest)");
    expect(source).toContain("WebhookReplayRequestJobData");
    expect(source).toContain("webhook_replay_review_${event.id}");
    expect(source).toContain('name: "webhook.replay.requested"');
    expect(source).toContain("manualApproval");
    expect(source).toContain("automaticReplay");
    expect(source).toContain("replayQueued: true");
    expect(source).toContain('replayMode = "MANUAL_OPERATOR_REVIEW_REQUIRED"');
  });

  it("sets an expiry timestamp when approving listings", () => {
    expect(source).toContain('data: {');
    expect(source).toContain('status: "LIVE"');
    expect(source).toContain("expiresAt: existingListing.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)");
  });

});
