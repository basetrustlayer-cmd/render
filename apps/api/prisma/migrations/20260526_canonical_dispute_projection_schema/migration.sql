ALTER TYPE "DisputeStatus" RENAME TO "DisputeStatus_old";

CREATE TYPE "DisputeStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'NEEDS_BUYER_RESPONSE',
  'NEEDS_SELLER_RESPONSE'
);

ALTER TABLE "disputes"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "DisputeStatus"
  USING (
    CASE
      WHEN "status"::text IN ('OPEN', 'UNDER_REVIEW', 'NEEDS_BUYER_RESPONSE', 'NEEDS_SELLER_RESPONSE')
        THEN "status"::text
      ELSE 'UNDER_REVIEW'
    END
  )::"DisputeStatus",
  ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "disputes"
  DROP COLUMN IF EXISTS "resolution",
  DROP COLUMN IF EXISTS "resolved_at",
  ADD COLUMN IF NOT EXISTS "trustlayer_dispute_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "dispute_status_cached" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "dispute_reason_cached" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "dispute_last_synced_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "disputes_trustlayer_dispute_id_idx"
  ON "disputes"("trustlayer_dispute_id");

DROP TYPE "DisputeStatus_old";
