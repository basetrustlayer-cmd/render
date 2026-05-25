ALTER TABLE "safe_deals"
  DROP COLUMN IF EXISTS "amount",
  DROP COLUMN IF EXISTS "fee_amount",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "funded_at",
  DROP COLUMN IF EXISTS "delivered_at",
  DROP COLUMN IF EXISTS "confirmed_at",
  DROP COLUMN IF EXISTS "inspection_deadline";

ALTER TABLE "safe_deals"
  ADD COLUMN IF NOT EXISTS "escrow_amount_cached" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "escrow_fee_cached" DECIMAL(12,2);

ALTER TABLE "disputes"
  ADD COLUMN IF NOT EXISTS "trustlayer_dispute_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "dispute_status_cached" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "dispute_last_synced_at" TIMESTAMPTZ(6);

ALTER TABLE "disputes"
  DROP COLUMN IF EXISTS "resolution",
  DROP COLUMN IF EXISTS "resolved_at";

DROP TYPE IF EXISTS "SafeDealStatus";
