-- Create AuditEvent table for audit consumer
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sourceService" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceHost" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "actorIpAddress" TEXT,
    "actorUserAgent" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "resourceAttributes" TEXT,
    "actionType" TEXT NOT NULL,
    "actionDescription" TEXT,
    "actionOutcome" TEXT NOT NULL,
    "actionReason" TEXT,
    "metadata" TEXT,
    "originalPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- Create indexes for common audit queries
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_idx" ON "AuditEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditEvent_userId_idx" ON "AuditEvent"("userId");
CREATE INDEX IF NOT EXISTS "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");
CREATE INDEX IF NOT EXISTS "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditEvent_aggregateType_idx" ON "AuditEvent"("aggregateType");
CREATE INDEX IF NOT EXISTS "AuditEvent_aggregateId_idx" ON "AuditEvent"("aggregateId");
CREATE INDEX IF NOT EXISTS "AuditEvent_sourceService_idx" ON "AuditEvent"("sourceService");
CREATE INDEX IF NOT EXISTS "AuditEvent_actorType_idx" ON "AuditEvent"("actorType");
CREATE INDEX IF NOT EXISTS "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");
CREATE INDEX IF NOT EXISTS "AuditEvent_resourceType_idx" ON "AuditEvent"("resourceType");
CREATE INDEX IF NOT EXISTS "AuditEvent_resourceId_idx" ON "AuditEvent"("resourceId");
CREATE INDEX IF NOT EXISTS "AuditEvent_actionType_idx" ON "AuditEvent"("actionType");
CREATE INDEX IF NOT EXISTS "AuditEvent_actionOutcome_idx" ON "AuditEvent"("actionOutcome");
CREATE INDEX IF NOT EXISTS "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_timestamp_idx" ON "AuditEvent"("tenantId", "timestamp");
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_eventType_idx" ON "AuditEvent"("tenantId", "eventType");
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_userId_idx" ON "AuditEvent"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "AuditEvent_aggregateType_aggregateId_idx" ON "AuditEvent"("aggregateType", "aggregateId");
CREATE INDEX IF NOT EXISTS "AuditEvent_eventType_timestamp_idx" ON "AuditEvent"("eventType", "timestamp");

-- Create a partial index for failed actions only
CREATE INDEX IF NOT EXISTS "AuditEvent_failed_actions_idx" ON "AuditEvent"("tenantId", "eventType", "timestamp") 
WHERE "actionOutcome" = 'failure';