CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(40) NOT NULL,
  "event_id" VARCHAR(160) NOT NULL,
  "event_type" VARCHAR(120) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
  "processed_at" TIMESTAMPTZ(6),
  "payload" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_id_key"
ON "webhook_events"("provider", "event_id");

CREATE INDEX IF NOT EXISTS "webhook_events_provider_idx"
ON "webhook_events"("provider");

CREATE INDEX IF NOT EXISTS "webhook_events_event_type_idx"
ON "webhook_events"("event_type");

CREATE INDEX IF NOT EXISTS "webhook_events_status_idx"
ON "webhook_events"("status");

CREATE INDEX IF NOT EXISTS "webhook_events_created_at_idx"
ON "webhook_events"("created_at");
