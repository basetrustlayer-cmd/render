CREATE TABLE "otp_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL,
  "code_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "attempts" SMALLINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_challenges_phone_idx" ON "otp_challenges"("phone");
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");
