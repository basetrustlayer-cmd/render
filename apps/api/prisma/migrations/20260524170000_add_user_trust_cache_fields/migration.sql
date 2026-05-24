ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "verification_status_cached" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "trust_badge_cached" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "trust_last_synced_at" TIMESTAMP(3);
