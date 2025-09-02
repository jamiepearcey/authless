-- Add trace ID fields to OutboxEvent, AuditLog, and AuditEvent tables
-- This enables distributed tracing across the entire system

-- Add traceId to OutboxEvent table
ALTER TABLE "public"."OutboxEvent" 
ADD COLUMN "traceId" TEXT;

-- Add index for traceId in OutboxEvent
CREATE INDEX "OutboxEvent_traceId_idx" ON "public"."OutboxEvent"("traceId");

-- Add traceId to AuditLog table
ALTER TABLE "public"."AuditLog" 
ADD COLUMN "traceId" TEXT;

-- Add index for traceId in AuditLog
CREATE INDEX "AuditLog_traceId_idx" ON "public"."AuditLog"("traceId");

-- Add traceId to AuditEvent table
ALTER TABLE "public"."AuditEvent" 
ADD COLUMN "traceId" TEXT;

-- Add index for traceId in AuditEvent
CREATE INDEX "AuditEvent_traceId_idx" ON "public"."AuditEvent"("traceId");

-- Add comments for documentation
COMMENT ON COLUMN "public"."OutboxEvent"."traceId" IS 'Distributed tracing ID for tracking events across services';
COMMENT ON COLUMN "public"."AuditLog"."traceId" IS 'Distributed tracing ID for tracking audit events across services';
COMMENT ON COLUMN "public"."AuditEvent"."traceId" IS 'Distributed tracing ID for tracking audit events across services';
