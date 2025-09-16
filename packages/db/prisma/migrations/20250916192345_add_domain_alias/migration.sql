/*
  Warnings:

  - The primary key for the `OutboxEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `OutboxEvent` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `caseNumberSeq` on the `SupportCase` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - A unique constraint covering the columns `[domainAlias]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `OutboxEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "traceId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dataJson" JSONB,
ADD COLUMN     "emailOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVariables" JSONB;

-- AlterTable
ALTER TABLE "OutboxEvent" DROP CONSTRAINT "OutboxEvent_pkey",
ADD COLUMN     "traceId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Passkey" ADD COLUMN     "rpId" TEXT;

-- AlterTable
ALTER TABLE "SupportCase" ALTER COLUMN "caseNumberSeq" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "domainAlias" TEXT,
ADD COLUMN     "registrationClosed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmailProvider" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyToEmail" TEXT,
    "config" JSONB NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastTested" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "EmailProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxEvent" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "tenantId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "traceId" TEXT,
    "source" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "InboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationIntent" (
    "id" TEXT NOT NULL,
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
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "NotificationIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "maxTries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "channels" TEXT[] DEFAULT ARRAY['realtime']::TEXT[],
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "realtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT NOT NULL,
    "html" TEXT,
    "text" TEXT,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailProvider_type_idx" ON "EmailProvider"("type");

-- CreateIndex
CREATE INDEX "EmailProvider_enabled_idx" ON "EmailProvider"("enabled");

-- CreateIndex
CREATE INDEX "EmailProvider_isDefault_idx" ON "EmailProvider"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "EmailProvider_type_key" ON "EmailProvider"("type");

-- CreateIndex
CREATE UNIQUE INDEX "InboxEvent_idempotencyKey_key" ON "InboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InboxEvent_status_nextAttemptAt_idx" ON "InboxEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "InboxEvent_tenantId_idx" ON "InboxEvent"("tenantId");

-- CreateIndex
CREATE INDEX "InboxEvent_eventType_idx" ON "InboxEvent"("eventType");

-- CreateIndex
CREATE INDEX "InboxEvent_traceId_idx" ON "InboxEvent"("traceId");

-- CreateIndex
CREATE INDEX "InboxEvent_source_idx" ON "InboxEvent"("source");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationIntent_idempotencyKey_key" ON "NotificationIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationIntent_tenantId_idx" ON "NotificationIntent"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationIntent_type_idx" ON "NotificationIntent"("type");

-- CreateIndex
CREATE INDEX "NotificationIntent_status_idx" ON "NotificationIntent"("status");

-- CreateIndex
CREATE INDEX "NotificationIntent_createdAt_idx" ON "NotificationIntent"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationIntent_idempotencyKey_idx" ON "NotificationIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

-- CreateIndex
CREATE INDEX "NotificationDelivery_createdAt_idx" ON "NotificationDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userId_idx" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_tenantId_idx" ON "NotificationPreferences"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_type_idx" ON "NotificationPreferences"("type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_tenantId_type_key" ON "NotificationPreferences"("userId", "tenantId", "type");

-- CreateIndex
CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE INDEX "NotificationTemplate_locale_idx" ON "NotificationTemplate"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_type_locale_key" ON "NotificationTemplate"("type", "locale");

-- CreateIndex
CREATE INDEX "OutboxEvent_traceId_idx" ON "OutboxEvent"("traceId");

-- CreateIndex
CREATE INDEX "Passkey_rpId_idx" ON "Passkey"("rpId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domainAlias_key" ON "Tenant"("domainAlias");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailProvider" ADD CONSTRAINT "EmailProvider_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationIntent" ADD CONSTRAINT "NotificationIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
