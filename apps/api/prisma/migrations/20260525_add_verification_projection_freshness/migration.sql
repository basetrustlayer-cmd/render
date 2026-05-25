ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "verification_last_synced_at" TIMESTAMP(3);

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "verification_projection_expires_at" TIMESTAMP(3);
