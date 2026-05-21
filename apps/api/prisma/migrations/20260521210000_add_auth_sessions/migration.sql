CREATE TABLE "auth_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "jti" VARCHAR(100) NOT NULL UNIQUE,
  "refresh_token_hash" VARCHAR(128) NOT NULL UNIQUE,
  "user_agent" TEXT,
  "ip_address" VARCHAR(64),
  "revoked_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_jti_idx" ON "auth_sessions"("jti");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
