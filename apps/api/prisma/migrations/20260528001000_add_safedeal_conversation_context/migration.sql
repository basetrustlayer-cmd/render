ALTER TABLE "safe_deals"
ADD COLUMN "conversation_id" UUID;

CREATE INDEX "safe_deals_conversation_id_idx"
ON "safe_deals"("conversation_id");

ALTER TABLE "safe_deals"
ADD CONSTRAINT "safe_deals_conversation_id_fkey"
FOREIGN KEY ("conversation_id")
REFERENCES "conversations"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
