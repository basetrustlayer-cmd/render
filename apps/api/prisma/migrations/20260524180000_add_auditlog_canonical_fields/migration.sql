ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "request_id" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "source" VARCHAR(80);

CREATE INDEX IF NOT EXISTS "audit_logs_request_id_idx" ON "audit_logs"("request_id");
CREATE INDEX IF NOT EXISTS "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX IF NOT EXISTS "audit_logs_source_idx" ON "audit_logs"("source");
