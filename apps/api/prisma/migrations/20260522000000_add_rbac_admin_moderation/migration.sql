CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');

ALTER TABLE "users"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
  ADD COLUMN "suspended_reason" TEXT,
  ADD COLUMN "moderation_notes" TEXT;

ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_is_suspended_idx" ON "users"("is_suspended");
