import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging persistence schema contract", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20260523010000_add_messaging_persistence_foundation/migration.sql"),
    "utf8"
  );

  it("defines conversations with buyer, seller, optional listing, and last message projection", () => {
    expect(schema).toContain("model Conversation");
    expect(schema).toContain('buyer          User      @relation("BuyerConversations"');
    expect(schema).toContain('seller         User      @relation("SellerConversations"');
    expect(schema).toContain("listing        Listing?");
    expect(schema).toContain("lastMessageAt  DateTime? @map(\"last_message_at\")");
  });

  it("defines messages with sender, conversation, body, read marker, and timestamps", () => {
    expect(schema).toContain("model Message");
    expect(schema).toContain('sender         User         @relation("SentMessages"');
    expect(schema).toContain("conversation   Conversation @relation");
    expect(schema).toContain("body           String       @db.VarChar(2000)");
    expect(schema).toContain("readAt         DateTime?    @map(\"read_at\")");
  });

  it("adds participant relation fields to user and listing relation fields", () => {
    expect(schema).toContain("conversationsAsBuyer Conversation[] @relation(\"BuyerConversations\")");
    expect(schema).toContain("conversationsAsSeller Conversation[] @relation(\"SellerConversations\")");
    expect(schema).toContain("messagesSent Message[] @relation(\"SentMessages\")");
    expect(schema).toContain("conversations    Conversation[]");
  });

  it("creates database indexes and constraints for participant access and chronology", () => {
    expect(migration).toContain('CREATE TABLE "conversations"');
    expect(migration).toContain('CREATE TABLE "messages"');
    expect(migration).toContain('CREATE INDEX "conversations_buyer_id_idx"');
    expect(migration).toContain('CREATE INDEX "conversations_seller_id_idx"');
    expect(migration).toContain('CREATE INDEX "messages_conversation_id_idx"');
    expect(migration).toContain('CREATE INDEX "messages_created_at_idx"');
  });

  it("does not make messaging models authoritative for TrustLayer financial or identity state", () => {
    const messagingSection = schema.slice(
      schema.indexOf("model Conversation"),
      schema.indexOf("model OtpChallenge")
    );

    expect(messagingSection).not.toContain("trustScore");
    expect(messagingSection).not.toContain("trustTier");
    expect(messagingSection).not.toContain("escrow");
    expect(messagingSection).not.toContain("settlement");
    expect(messagingSection).not.toContain("payout");
  });
});
