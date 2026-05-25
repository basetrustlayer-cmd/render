ALTER TABLE "safe_deals"
  ADD COLUMN IF NOT EXISTS "dispute_status_cached" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "dispute_reason_cached" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "dispute_last_synced_at" TIMESTAMPTZ(6);
