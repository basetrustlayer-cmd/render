ALTER TABLE "users"
ADD COLUMN "email_marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN "google_account_id" VARCHAR(255);

CREATE UNIQUE INDEX "users_google_account_id_key" ON "users"("google_account_id");
