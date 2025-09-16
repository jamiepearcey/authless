-- Add notification intent table for explicit notification requests
CREATE TABLE "NotificationIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "traceId" TEXT,
    "idempotencyKey" TEXT UNIQUE,
    "expiresAt" TIMESTAMP(3)
);

-- Add notification delivery tracking table
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "maxTries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB
);

-- Add notification preferences table
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY['realtime'],
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "realtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreferences_userId_tenantId_type_key" UNIQUE ("userId", "tenantId", "type")
);

-- Add notification templates table (optional)
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT NOT NULL,
    "html" TEXT,
    "text" TEXT,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationTemplate_type_locale_key" UNIQUE ("type", "locale")
);

-- Update existing Notification table to support new fields
ALTER TABLE "Notification" ADD COLUMN "dataJson" JSONB;
ALTER TABLE "Notification" ADD COLUMN "isAlert" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "emailOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "templateVariables" JSONB;

-- Add foreign key constraints
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" 
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "NotificationIntent_tenantId_idx" ON "NotificationIntent"("tenantId");
CREATE INDEX "NotificationIntent_type_idx" ON "NotificationIntent"("type");
CREATE INDEX "NotificationIntent_status_idx" ON "NotificationIntent"("status");
CREATE INDEX "NotificationIntent_createdAt_idx" ON "NotificationIntent"("createdAt");
CREATE INDEX "NotificationIntent_idempotencyKey_idx" ON "NotificationIntent"("idempotencyKey");

CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");
CREATE INDEX "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");

CREATE INDEX "NotificationPreferences_userId_idx" ON "NotificationPreferences"("userId");
CREATE INDEX "NotificationPreferences_tenantId_idx" ON "NotificationPreferences"("tenantId");
CREATE INDEX "NotificationPreferences_type_idx" ON "NotificationPreferences"("type");

CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");
CREATE INDEX "NotificationTemplate_locale_idx" ON "NotificationTemplate"("locale");

-- Add trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_delivery_updated_at 
    BEFORE UPDATE ON "NotificationDelivery" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON "NotificationPreferences" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_template_updated_at 
    BEFORE UPDATE ON "NotificationTemplate" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
