ALTER TABLE "users"
ADD COLUMN "paystack_recipient_code" VARCHAR(100),
ADD COLUMN "payout_ready" BOOLEAN NOT NULL DEFAULT false;
