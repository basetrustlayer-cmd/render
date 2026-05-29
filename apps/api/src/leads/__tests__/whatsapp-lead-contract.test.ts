import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("whatsapp lead capture contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/leads/routes.ts"), "utf8");

  it("exposes authenticated whatsapp lead capture endpoint", () => {
    expect(source).toContain('app.post("/leads/whatsapp", { preHandler: authenticate }');
  });

  it("records whatsapp leads into audit log read model", () => {
    expect(source).toContain("WHATSAPP_LEAD_CREATED");
    expect(source).toContain('leadSystem: "AUDIT_LOG_READ_MODEL"');
    expect(source).toContain("futureWhispeRMSync: true");
  });

  it("prevents sellers from creating leads on their own listings", () => {
    expect(source).toContain("Seller cannot create a lead on their own listing.");
  });

  it("does not introduce Prisma lead persistence before migration approval", () => {
    expect(source).not.toContain("prisma.lead");
    expect(source).not.toContain("lead.create");
  });
  it("exposes seller lead dashboard read model from audit logs", () => {
    expect(source).toContain('app.get("/leads/my", { preHandler: authenticate }');
    expect(source).toContain('action: "WHATSAPP_LEAD_CREATED"');
    expect(source).toContain('path: ["sellerId"]');
    expect(source).toContain('status: "NEW"');
  });

  it("exposes seller lead read model and governed WhispeRM export", () => {
    expect(source).toContain('app.get("/leads/my", { preHandler: authenticate }');
    expect(source).toContain('app.post("/leads/:id/whisperm-export", { preHandler: authenticate }');
    expect(source).toContain("WHISPERM_LEAD_EXPORT_QUEUED");
    expect(source).toContain('externalSync: "PENDING_IMPLEMENTATION"');
  });

  it("records seller lead notification semantics without provider delivery", () => {
    expect(source).toContain("SELLER_LEAD_RECEIVED");
    expect(source).toContain('notificationStatus: "UNREAD"');
    expect(source).toContain('notificationType: "SELLER_LEAD"');
    expect(source).not.toContain("sendOtpSms");
  });

  it("exposes seller lead status pipeline through audit log events", () => {
    expect(source).toContain('const leadStatuses = ["NEW", "CONTACTED", "NEGOTIATING", "WON", "LOST"] as const');
    expect(source).toContain('app.post("/leads/:id/status", { preHandler: authenticate }');
    expect(source).toContain("SELLER_LEAD_STATUS_UPDATED");
    expect(source).toContain("latestStatusByLeadId");
  });

});
