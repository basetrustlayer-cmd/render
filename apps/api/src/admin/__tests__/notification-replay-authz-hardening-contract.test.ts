import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification replay authz hardening contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const auth = readFileSync(resolve(process.cwd(), "src/auth/middleware.ts"), "utf8");

  it("keeps replay request restricted to super admins only", () => {
    const replayRouteStart = source.indexOf('app.post("/admin/notifications/dead-letter/:id/replay-request"');
    const nextRouteStart = source.indexOf('app.get("/admin/notifications/replay-summary"', replayRouteStart);
    const replayRoute = source.slice(replayRouteStart, nextRouteStart);

    expect(replayRouteStart).toBeGreaterThanOrEqual(0);
    expect(nextRouteStart).toBeGreaterThan(replayRouteStart);
    expect(replayRoute).toContain("preHandler: [authenticate, requireSuperAdmin]");
    expect(replayRoute).not.toContain("requireAdmin]");
    expect(replayRoute).not.toContain("requireModerator]");
  });

  it("requires authenticated actor context for all replay audit outcomes", () => {
    expect(source).toContain("const authUser = requireAuthUser(request)");
    expect(source).toContain('actorUserId: authUser.userId');
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_BLOCKED"');
    expect(source).toContain('action: "NOTIFICATION_DEAD_LETTER_REPLAY_REQUESTED"');
  });

  it("preserves suspended-user and session-validity enforcement before role checks", () => {
    expect(auth).toContain("AUTH_SUSPENDED_USER_REJECTED");
    expect(auth).toContain("AUTH_SESSION_INVALID");
    expect(auth).toContain("requireRole");
    expect(auth).toContain("roleRank[user.role] < roleRank[minimumRole]");
  });

  it("does not expose replay request through read-only dead-letter listing", () => {
    expect(source).toContain('app.get("/admin/notifications/dead-letter"');
    expect(source).toContain("replayEnabled: false");
    expect(source).not.toContain('app.get("/admin/notifications/dead-letter/:id/replay-request"');
  });
});
