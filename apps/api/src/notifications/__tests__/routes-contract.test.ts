import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/notifications/routes.ts"), "utf8");
  const hubtelSource = readFileSync(resolve(process.cwd(), "src/notifications/hubtel.ts"), "utf8");

  it("keeps notification health public and provider-aware", () => {
    expect(source).toContain('app.get("/notifications/health", async () => {');
    expect(source).toContain("RESEND_API_KEY");
    expect(source).toContain("HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET");
    expect(source).toContain("FIREBASE_SERVER_KEY");
  });

  it("keeps outbound notification provider routes explicitly pending", () => {
    expect(source).toContain("Email provider integration pending.");
    expect(source).toContain("Hubtel SMS integration pending.");
    expect(source).toContain("Push notification integration pending.");
    expect(source.match(/reply\.code\(501\)/g)?.length).toBe(3);
  });

  it("validates email, sms, and push payloads before provider handling", () => {
    expect(source).toContain("emailNotificationSchema.safeParse(request.body)");
    expect(source).toContain("smsNotificationSchema.safeParse(request.body)");
    expect(source).toContain("pushNotificationSchema.safeParse(request.body)");
    expect(source).toContain("Invalid email notification payload.");
    expect(source).toContain("Invalid SMS notification payload.");
    expect(source).toContain("Invalid push notification payload.");
  });

  it("keeps direct notification routes unauthenticated only while integration is pending", () => {
    expect(source).not.toContain("preHandler: authenticate");
    expect(source.match(/reply\.code\(501\)/g)?.length).toBe(3);
  });

  it("does not expose notification preference persistence before schema is ready", () => {
    expect(source).not.toContain("notificationPreference");
    expect(source).not.toContain("prisma.notification");
    expect(source).not.toContain("../database/client.js");
  });

  it("keeps delivery payload limits bounded", () => {
    expect(source).toContain("subject: z.string().min(1).max(200)");
    expect(source).toContain("body: z.string().min(1).max(5000)");
    expect(source).toContain("body: z.string().min(1).max(1000)");
    expect(source).toContain("title: z.string().min(1).max(120)");
  });

  it("requires Hubtel credentials in production for OTP SMS", () => {
    expect(hubtelSource).toContain('process.env.NODE_ENV === "production"');
    expect(hubtelSource).toContain("Hubtel SMS credentials are required in production.");
  });

  it("allows non-production OTP SMS to skip provider calls safely", () => {
    expect(hubtelSource).toContain('provider: "DEV"');
    expect(hubtelSource).toContain('status: "SKIPPED"');
  });

  it("uses Hubtel basic auth and sender configuration for real SMS delivery", () => {
    expect(hubtelSource).toContain("HUBTEL_CLIENT_ID");
    expect(hubtelSource).toContain("HUBTEL_CLIENT_SECRET");
    expect(hubtelSource).toContain('process.env.HUBTEL_SENDER_ID ?? "Render"');
    expect(hubtelSource).toContain("Authorization: `Basic ${Buffer.from");
    expect(hubtelSource).toContain("https://sms.hubtel.com/v1/messages/send");
  });

  it("does not silently swallow Hubtel provider failures", () => {
    expect(hubtelSource).toContain("if (!response.ok)");
    expect(hubtelSource).toContain("Hubtel SMS failed");
  });
});
