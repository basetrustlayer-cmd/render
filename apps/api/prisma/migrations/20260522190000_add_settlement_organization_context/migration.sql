ALTER TABLE "settlements"
ADD COLUMN "organization_id" UUID;

CREATE INDEX "settlements_organization_id_idx" ON "settlements"("organization_id");

ALTER TABLE "settlements"
ADD CONSTRAINT "settlements_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
