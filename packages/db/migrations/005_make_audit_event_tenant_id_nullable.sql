-- Make tenantId nullable in AuditEvent table to support system/global events
-- This allows auditing of events that don't belong to a specific tenant

ALTER TABLE "AuditEvent" ALTER COLUMN "tenantId" DROP NOT NULL;
