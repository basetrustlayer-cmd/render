ALTER TABLE "conversations" ADD COLUMN "organization_id" UUID;

CREATE INDEX "conversations_organization_id_idx" ON "conversations"("organization_id");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
