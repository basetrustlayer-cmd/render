import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging route contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/messaging/routes.ts"), "utf8");

  it("keeps conversation creation authenticated", () => {
    expect(source).toContain('app.post("/conversations", { preHandler: authenticate }');
  });

  it("keeps message sending authenticated", () => {
    expect(source).toContain('app.post("/messages", { preHandler: authenticate }');
  });

  it("keeps message reads public only while persistence is pending", () => {
    expect(source).toContain('app.get("/conversations/:id/messages", async (request, reply) => {');
    expect(source).toContain("messages: []");
  });

  it("validates conversation creation payloads", () => {
    expect(source).toContain("createConversationSchema.safeParse(request.body)");
    expect(source).toContain("buyerId: z.string().uuid()");
    expect(source).toContain("sellerId: z.string().uuid()");
    expect(source).toContain("listingId: z.string().uuid().optional()");
    expect(source).toContain("Invalid conversation payload.");
  });

  it("validates conversation message read params", () => {
    expect(source).toContain("id: z.string().uuid()");
    expect(source).toContain("Invalid conversation ID.");
    expect(source).toContain("conversationId: params.data.id");
  });

  it("validates outbound message payloads", () => {
    expect(source).toContain("sendMessageSchema.safeParse(request.body)");
    expect(source).toContain("conversationId: z.string().uuid()");
    expect(source).toContain("senderId: z.string().uuid()");
    expect(source).toContain("body: z.string().min(1).max(2000)");
    expect(source).toContain("Invalid message payload.");
  });

  it("keeps persistence writes explicitly pending", () => {
    expect(source).toContain("Messaging persistence is pending Prisma client generation in CI/Render.");
    expect(source).toContain("Message persistence is pending Prisma client generation in CI/Render.");
    expect(source.match(/reply.code\(501\)/g)?.length).toBe(2);
  });
});
