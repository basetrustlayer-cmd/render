CREATE TYPE "DisputeStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'NEEDS_BUYER_RESPONSE',
  'NEEDS_SELLER_RESPONSE',
  'RESOLVED_BUYER_REFUND',
  'RESOLVED_SELLER_RELEASE',
  'CANCELLED'
);

CREATE TYPE "DisputeEventType" AS ENUM (
  'OPENED',
  'EVIDENCE_ADDED',
  'STATUS_CHANGED',
  'MODERATOR_NOTE',
  'RESOLVED'
);

CREATE TABLE "disputes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "safe_deal_id" UUID NOT NULL,
  "opened_by_id" UUID NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "reason" VARCHAR(500) NOT NULL,
  "resolution" TEXT,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dispute_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dispute_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "event_type" "DisputeEventType" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "disputes_safe_deal_id_key" ON "disputes"("safe_deal_id");
CREATE INDEX "disputes_status_idx" ON "disputes"("status");
CREATE INDEX "disputes_opened_by_id_idx" ON "disputes"("opened_by_id");
CREATE INDEX "disputes_created_at_idx" ON "disputes"("created_at");

CREATE INDEX "dispute_events_dispute_id_idx" ON "dispute_events"("dispute_id");
CREATE INDEX "dispute_events_actor_user_id_idx" ON "dispute_events"("actor_user_id");
CREATE INDEX "dispute_events_event_type_idx" ON "dispute_events"("event_type");
CREATE INDEX "dispute_events_created_at_idx" ON "dispute_events"("created_at");

ALTER TABLE "disputes"
ADD CONSTRAINT "disputes_safe_deal_id_fkey"
FOREIGN KEY ("safe_deal_id") REFERENCES "safe_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
ADD CONSTRAINT "disputes_opened_by_id_fkey"
FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dispute_events"
ADD CONSTRAINT "dispute_events_dispute_id_fkey"
FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
