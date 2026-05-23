import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/messaging/routes.ts"), "utf8");

  it("keeps conversation and message routes authenticated", () => {
    expect(source).toContain('app.get("/conversations", { preHandler: authenticate }');
    expect(source).toContain('app.post("/conversations", { preHandler: authenticate }');
    expect(source).toContain('app.get("/conversations/:id/messages", { preHandler: authenticate }');
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

  it("enforces participant access boundaries", () => {
    expect(source).toContain("isConversationParticipant");
    expect(source).toContain("Conversation participant access required.");
    expect(source).toContain("Message sender must match authenticated user.");
    expect(source).toContain("parsed.data.senderId !== authUser.userId");
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
    expect(source).toContain("senderId: z.string().uuid()");
    expect(source).toContain("body: z.string().min(1).max(2000)");
    expect(source).toContain("Invalid message payload.");
  });

  it("updates last message projection when messages are sent", () => {
    expect(source).toContain("lastMessageAt: created.createdAt");
    expect(source).toContain("prisma.$transaction");
  });

  it("audits conversation and message creation without blocking flow", () => {
    expect(source).toContain("CONVERSATION_CREATED");
    expect(source).toContain("MESSAGE_SENT");
    expect(source).toContain("writeAuditLog");
  });

  it("keeps TrustLayer authority out of messaging persistence", () => {
    expect(source).not.toContain("createTrustLayerClient");
    expect(source).not.toContain("trustScore");
    expect(source).not.toContain("escrow");
    expect(source).not.toContain("settlement");
  });
});
