ALTER TABLE "auth_sessions"
ADD COLUMN "device_fingerprint_hash" VARCHAR(128),
ADD COLUMN "csrf_token_hash" VARCHAR(128);

CREATE INDEX "auth_sessions_device_fingerprint_hash_idx"
ON "auth_sessions"("device_fingerprint_hash");
