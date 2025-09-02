-- Initialize database tables for Authless services

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create AuditEvent table for audit service
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    id UUID PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    "sourceService" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "actionType" TEXT NOT NULL,
    "actionDescription" TEXT,
    "actionOutcome" TEXT,
    "actionReason" TEXT,
    metadata JSONB,
    "originalPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create OutboxEvent table for outbox service
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT,
    "userId" TEXT,
    "correlationId" TEXT,
    "causationId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "publishedAt" TIMESTAMPTZ NULL,
    "attempts" INTEGER DEFAULT 0,
    "maxTries" INTEGER DEFAULT 3,
    "lastAttemptAt" TIMESTAMPTZ NULL,
    "lastError" TEXT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed'))
);

-- Create WebhookEndpoint table for webhook service
CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL,
    "tenantId" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "maxRetries" INTEGER DEFAULT 3,
    timeout INTEGER DEFAULT 30000,
    headers JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create WebhookDelivery table for webhook service
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "webhookId" UUID NOT NULL REFERENCES "WebhookEndpoint"(id) ON DELETE CASCADE,
    "eventId" TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "responseTime" INTEGER NOT NULL,
    error TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created 
    ON "AuditEvent" ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_audit_events_event_name 
    ON "AuditEvent" ("eventName");

CREATE INDEX IF NOT EXISTS idx_audit_events_aggregate 
    ON "AuditEvent" ("aggregateType", "aggregateId");

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created 
    ON "OutboxEvent" (status, "createdAt") 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_events_tenant 
    ON "OutboxEvent" ("tenantId");

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active 
    ON "WebhookEndpoint" ("isActive", "tenantId") 
    WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_delivered 
    ON "WebhookDelivery" ("webhookId", "deliveredAt");

-- Insert sample data for testing
INSERT INTO "WebhookEndpoint" (id, name, url, events, "tenantId", "isActive") VALUES 
    (uuid_generate_v4(), 'Test Webhook', 'https://httpbin.org/post', ARRAY['user.created', 'user.updated'], 'test-tenant', true)
ON CONFLICT DO NOTHING;

-- Create a test outbox event for verification
INSERT INTO "OutboxEvent" ("aggregateType", "aggregateId", "eventName", "eventData", "tenantId", "correlationId") VALUES 
    ('User', uuid_generate_v4()::text, 'events.audit.user.test', 
     jsonb_build_object(
         'id', uuid_generate_v4(),
         'eventType', 'UserEvent',
         'eventName', 'user.test',
         'tenantId', 'test-tenant',
         'userId', uuid_generate_v4(),
         'aggregateType', 'User',
         'aggregateId', uuid_generate_v4(),
         'timestamp', NOW(),
         'source', jsonb_build_object('service', 'init-script', 'version', '1.0.0'),
         'actor', jsonb_build_object('type', 'system', 'id', 'init-script', 'name', 'Database Init'),
         'resource', jsonb_build_object('type', 'User', 'id', uuid_generate_v4(), 'name', 'Test User'),
         'action', jsonb_build_object('type', 'CREATE', 'description', 'Database initialization test', 'outcome', 'success', 'reason', 'System initialization'),
         'metadata', jsonb_build_object('source', 'database-init', 'test', true),
         'originalPayload', jsonb_build_object('message', 'This is a test event created during database initialization')
     ), 
     'test-tenant', 
     uuid_generate_v4()::text)
ON CONFLICT DO NOTHING;

-- Log initialization
SELECT 'Database initialized successfully with tables: AuditEvent, OutboxEvent, WebhookEndpoint, WebhookDelivery' as message;