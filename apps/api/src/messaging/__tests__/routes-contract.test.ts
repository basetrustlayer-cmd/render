import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/messaging/routes.ts"), "utf8");

  it("keeps conversation, message, and read receipt routes authenticated", () => {
    expect(source).toContain('app.get("/conversations", { preHandler: authenticate }');
    expect(source).toContain('app.post("/conversations", { preHandler: authenticate }');
    expect(source).toContain('app.get("/conversations/:id/messages", { preHandler: authenticate }');
    expect(source).toContain('app.post("/messages/:id/read", { preHandler: authenticate }');
    expect(source).toContain('app.post("/messages", { preHandler: authenticate }');
    expect(source).toContain("requireAuthUser(request)");
  });

  it("uses Prisma-backed messaging persistence", () => {
    expect(source).toContain("prisma.conversation.findMany");
    expect(source).toContain("prisma.conversation.findFirst");
    expect(source).toContain("prisma.conversation.create");
    expect(source).toContain("prisma.message.findMany");
    expect(source).toContain("tx.message.create");
    expect(source).toContain("tx.conversation.update");
  });

  it("supports message read receipt persistence", () => {
    expect(source).toContain("messageParamsSchema.safeParse(request.params)");
    expect(source).toContain("Invalid message ID.");
    expect(source).toContain("prisma.message.findUnique");
    expect(source).toContain("prisma.message.update");
    expect(source).toContain("data: { readAt: new Date() }");
    expect(source).toContain("MESSAGE_READ");
  });

  it("keeps read receipt marking idempotent", () => {
    expect(source).toContain("if (message.readAt)");
    expect(source).toContain("read: true");
  });

  it("prevents senders from marking their own messages as read", () => {
    expect(source).toContain("message.senderId === authUser.userId");
    expect(source).toContain("Message sender cannot mark own message as read.");
  });

  it("enforces participant and tenant access boundaries", () => {
    expect(source).toContain("isConversationParticipant");
    expect(source).toContain("Conversation participant access required.");
    expect(source).toContain("senderId: authUser.userId");
    expect(source).not.toContain("parsed.data.senderId");
    expect(source).toContain("getRequestedOrganizationId");
    expect(source).toContain("requireActiveOrganizationMembership");
    expect(source).toContain("enforceConversationTenantAccess");
    expect(source).toContain("Invalid organization context.");
  });

  it("validates conversation creation payloads", () => {
    expect(source).toContain("createConversationSchema.safeParse(request.body)");
    expect(source).toContain("buyerId: z.string().uuid()");
    expect(source).toContain("sellerId: z.string().uuid()");
    expect(source).toContain("listingId: z.string().uuid().optional()");
    expect(source).toContain("Invalid conversation payload.");
  });

  it("validates conversation message read params", () => {
    expect(source).toContain("conversationParamsSchema.safeParse(request.params)");
    expect(source).toContain("id: z.string().uuid()");
    expect(source).toContain("Invalid conversation ID.");
    expect(source).toContain("conversationId: conversation.id");
  });

  it("validates outbound message payloads", () => {
    expect(source).toContain("sendMessageSchema.safeParse(request.body)");
    expect(source).toContain("conversationId: z.string().uuid()");
    expect(source).not.toContain("senderId: z.string().uuid()");
    expect(source).toContain("body: z.string().min(1).max(2000)");
    expect(source).toContain("Invalid message payload.");
  });

  it("updates last message projection when messages are sent", () => {
    expect(source).toContain("lastMessageAt: created.createdAt");
    expect(source).toContain("prisma.$transaction");
  });

  it("audits conversation, message creation, and read receipts with organization context", () => {
    expect(source).toContain("CONVERSATION_CREATED");
    expect(source).toContain("MESSAGE_SENT");
    expect(source).toContain("MESSAGE_READ");
    expect(source).toContain("writeAuditLog");
    expect(source).toContain("organizationId");
  });

  it("keeps TrustLayer authority out of messaging persistence", () => {
    expect(source).not.toContain("createTrustLayerClient");
    expect(source).not.toContain("trustScore");
    expect(source).not.toContain("escrow");
    expect(source).not.toContain("settlement");
  });
});
