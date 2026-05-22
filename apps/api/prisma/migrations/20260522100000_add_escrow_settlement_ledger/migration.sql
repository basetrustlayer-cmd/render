CREATE TYPE "EscrowLedgerEntryType" AS ENUM (
  'BUYER_HOLD',
  'PLATFORM_FEE',
  'SELLER_PAYABLE',
  'BUYER_REFUND',
  'SETTLEMENT_RELEASE',
  'ADJUSTMENT'
);

CREATE TYPE "SettlementStatus" AS ENUM (
  'PENDING',
  'READY',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "escrow_ledger_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "safe_deal_id" UUID NOT NULL,
  "entry_type" "EscrowLedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
  "idempotency_key" VARCHAR(160) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "escrow_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "safe_deal_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "platform_fee_amount" DECIMAL(12,2) NOT NULL,
  "seller_receivable_amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "provider" VARCHAR(40),
  "provider_reference" VARCHAR(120),
  "failure_reason" TEXT,
  "ready_at" TIMESTAMPTZ(6),
  "paid_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "escrow_ledger_entries_idempotency_key_key" ON "escrow_ledger_entries"("idempotency_key");
CREATE INDEX "escrow_ledger_entries_safe_deal_id_idx" ON "escrow_ledger_entries"("safe_deal_id");
CREATE INDEX "escrow_ledger_entries_entry_type_idx" ON "escrow_ledger_entries"("entry_type");
CREATE INDEX "escrow_ledger_entries_created_at_idx" ON "escrow_ledger_entries"("created_at");

CREATE UNIQUE INDEX "settlements_safe_deal_id_key" ON "settlements"("safe_deal_id");
CREATE INDEX "settlements_seller_id_idx" ON "settlements"("seller_id");
CREATE INDEX "settlements_status_idx" ON "settlements"("status");
CREATE INDEX "settlements_created_at_idx" ON "settlements"("created_at");

ALTER TABLE "escrow_ledger_entries"
  ADD CONSTRAINT "escrow_ledger_entries_safe_deal_id_fkey"
  FOREIGN KEY ("safe_deal_id") REFERENCES "safe_deals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_safe_deal_id_fkey"
  FOREIGN KEY ("safe_deal_id") REFERENCES "safe_deals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
