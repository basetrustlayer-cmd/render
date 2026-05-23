import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("notification route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/notifications/routes.ts"), "utf8");
  const hubtelSource = readFileSync(resolve(process.cwd(), "src/notifications/hubtel.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("keeps notification health public and provider-aware", () => {
    expect(source).toContain('app.get("/notifications/health", async () => {');
    expect(source).toContain("RESEND_API_KEY");
    expect(source).toContain("HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET");
    expect(source).toContain("FIREBASE_SERVER_KEY");
  });

  it("keeps notification preference routes authenticated", () => {
    expect(source).toContain('app.get("/notification-preferences", { preHandler: authenticate }');
    expect(source).toContain('app.put("/notification-preferences", { preHandler: authenticate }');
    expect(source).toContain("requireAuthUser(request)");
  });

  it("validates notification preference channel and purpose fields", () => {
    expect(source).toContain("notificationPreferenceSchema.safeParse(request.body)");
    expect(source).toContain("email: z.boolean()");
    expect(source).toContain("sms: z.boolean()");
    expect(source).toContain("push: z.boolean()");
    expect(source).toContain("marketing: z.boolean()");
    expect(source).toContain("transactional: z.boolean()");
    expect(source).toContain("Invalid notification preference payload.");
  });

  it("uses Prisma-backed notification preference persistence", () => {
    expect(source).toContain("prisma.notificationPreference.upsert");
    expect(source).toContain("where: { userId: authUser.userId }");
    expect(source).toContain("create: { userId: authUser.userId }");
    expect(source).toContain("update: parsed.data");
    expect(source).not.toContain("Notification preference persistence pending.");
  });

  it("defines notification preference schema with safe defaults", () => {
    expect(schema).toContain("model NotificationPreference");
    expect(schema).toContain("userId        String   @unique @map(\"user_id\") @db.Uuid");
    expect(schema).toContain("email         Boolean  @default(true)");
    expect(schema).toContain("sms           Boolean  @default(true)");
    expect(schema).toContain("push          Boolean  @default(false)");
    expect(schema).toContain("marketing     Boolean  @default(false)");
    expect(schema).toContain("transactional Boolean  @default(true)");
    expect(schema).toContain("@@map(\"notification_preferences\")");
  });

  it("audits notification preference updates", () => {
    expect(source).toContain("NOTIFICATION_PREFERENCES_UPDATED");
    expect(source).toContain("updatedFields: Object.keys(parsed.data)");
    expect(source).toContain("writeAuditLog");
  });

  it("keeps email and sms provider routes pending while push delivery is queued", () => {
    expect(source).toContain("Email provider integration pending.");
    expect(source).toContain("Hubtel SMS integration pending.");
    expect(source.match(/reply\.code\(501\)/g)?.length).toBe(2);
    expect(source).toContain("createRenderQueue(RENDER_QUEUE_NAMES.pushNotificationDelivery)");
    expect(source).toContain("PUSH_NOTIFICATION_DELIVERY_ENQUEUED");
    expect(source).toContain("return reply.code(202).send");
  });

  it("validates email, sms, and push payloads before provider handling", () => {
    expect(source).toContain("emailNotificationSchema.safeParse(request.body)");
    expect(source).toContain("smsNotificationSchema.safeParse(request.body)");
    expect(source).toContain("pushNotificationSchema.safeParse(request.body)");
    expect(source).toContain("Invalid email notification payload.");
    expect(source).toContain("Invalid SMS notification payload.");
    expect(source).toContain("Invalid push notification payload.");
  });

  it("keeps direct notification provider routes unauthenticated only while integration is pending", () => {
    expect(source).toContain('app.post("/notifications/email", async (request, reply) => {');
    expect(source).toContain('app.post("/notifications/sms", async (request, reply) => {');
    expect(source).toContain('app.post("/notifications/push", async (request, reply) => {');
    expect(source).not.toContain('app.post("/notifications/email", { preHandler: authenticate }');
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
