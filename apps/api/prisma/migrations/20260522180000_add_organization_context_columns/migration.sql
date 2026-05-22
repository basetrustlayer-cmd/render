ALTER TABLE "listings"
ADD COLUMN "organization_id" UUID;

ALTER TABLE "safe_deals"
ADD COLUMN "organization_id" UUID;

ALTER TABLE "disputes"
ADD COLUMN "organization_id" UUID;

ALTER TABLE "audit_logs"
ADD COLUMN "organization_id" UUID;

CREATE INDEX "listings_organization_id_idx" ON "listings"("organization_id");
CREATE INDEX "safe_deals_organization_id_idx" ON "safe_deals"("organization_id");
CREATE INDEX "disputes_organization_id_idx" ON "disputes"("organization_id");
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

ALTER TABLE "listings"
ADD CONSTRAINT "listings_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "safe_deals"
ADD CONSTRAINT "safe_deals_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "disputes"
ADD CONSTRAINT "disputes_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
