-- Migration: Add help types and tenant-specific email routing for support
-- This adds help type categorization and email routing per help type for tenants

-- Add helpType field to ContactReason
ALTER TABLE "ContactReason" ADD COLUMN "helpType" TEXT DEFAULT 'general';

-- Add routing email configuration table for tenants
CREATE TABLE "TenantSupportRouting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "helpType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSupportRouting_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on tenantId + helpType combination
CREATE UNIQUE INDEX "TenantSupportRouting_tenantId_helpType_key" ON "TenantSupportRouting"("tenantId", "helpType");

-- Add foreign key to tenant
ALTER TABLE "TenantSupportRouting" ADD CONSTRAINT "TenantSupportRouting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "TenantSupportRouting_tenantId_idx" ON "TenantSupportRouting"("tenantId");
CREATE INDEX "TenantSupportRouting_helpType_idx" ON "TenantSupportRouting"("helpType");
CREATE INDEX "TenantSupportRouting_isActive_idx" ON "TenantSupportRouting"("isActive");
CREATE INDEX "ContactReason_helpType_idx" ON "ContactReason"("helpType");

-- Update existing contact reasons with appropriate help types
UPDATE "ContactReason" SET "helpType" = 'technical' WHERE "key" IN ('bug_report', 'feature_request', 'technical_support');
UPDATE "ContactReason" SET "helpType" = 'billing' WHERE "key" IN ('billing_inquiry', 'payment_issue', 'subscription');
UPDATE "ContactReason" SET "helpType" = 'account' WHERE "key" IN ('account_access', 'password_reset', 'profile_update');
UPDATE "ContactReason" SET "helpType" = 'general' WHERE "helpType" IS NULL OR "helpType" = 'general';

-- Make helpType not null now that we've set defaults
ALTER TABLE "ContactReason" ALTER COLUMN "helpType" SET NOT NULL;