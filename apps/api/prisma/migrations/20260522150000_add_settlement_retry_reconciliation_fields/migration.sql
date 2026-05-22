ALTER TABLE "settlements"
ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_attempt_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "settlements_next_retry_at_idx"
ON "settlements"("next_retry_at");
