ALTER TABLE "users"
DROP COLUMN IF EXISTS "paystack_recipient_code",
DROP COLUMN IF EXISTS "payout_ready";

ALTER TABLE "safe_deals"
DROP COLUMN IF EXISTS "paystack_reference",
DROP COLUMN IF EXISTS "trustlayer_txn_id",
ADD COLUMN IF NOT EXISTS "trustlayer_escrow_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "checkout_url" TEXT,
ADD COLUMN IF NOT EXISTS "escrow_status_cached" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "escrow_last_synced_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "safe_deals_trustlayer_escrow_id_idx"
ON "safe_deals"("trustlayer_escrow_id");

CREATE INDEX IF NOT EXISTS "safe_deals_escrow_status_cached_idx"
ON "safe_deals"("escrow_status_cached");
