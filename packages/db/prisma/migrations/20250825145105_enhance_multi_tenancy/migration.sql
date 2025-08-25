/*
  Warnings:

  - Added the required column `updatedAt` to the `ContactReply` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN "assignedTo" TEXT;
ALTER TABLE "ContactMessage" ADD COLUMN "category" TEXT;
ALTER TABLE "ContactMessage" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "ContactMessage" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "ContactMessage" ADD COLUMN "tags" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "id", "ipAddress", "resourceId", "resourceType", "tenantId", "userAgent", "userId") SELECT "action", "createdAt", "details", "id", "ipAddress", "resourceId", "resourceType", "tenantId", "userAgent", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_ContactReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactReason_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContactReason" ("createdAt", "description", "icon", "id", "isActive", "key", "label", "sortOrder", "updatedAt") SELECT "createdAt", "description", "icon", "id", "isActive", "key", "label", "sortOrder", "updatedAt" FROM "ContactReason";
DROP TABLE "ContactReason";
ALTER TABLE "new_ContactReason" RENAME TO "ContactReason";
CREATE UNIQUE INDEX "ContactReason_key_key" ON "ContactReason"("key");
CREATE INDEX "ContactReason_tenantId_idx" ON "ContactReason"("tenantId");
CREATE INDEX "ContactReason_isActive_idx" ON "ContactReason"("isActive");
CREATE INDEX "ContactReason_sortOrder_idx" ON "ContactReason"("sortOrder");
CREATE TABLE "new_ContactReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactMessageId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromUser" BOOLEAN NOT NULL DEFAULT false,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactReply_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContactReply" ("contactMessageId", "createdAt", "id", "isFromUser", "message") SELECT "contactMessageId", "createdAt", "id", "isFromUser", "message" FROM "ContactReply";
DROP TABLE "ContactReply";
ALTER TABLE "new_ContactReply" RENAME TO "ContactReply";
CREATE INDEX "ContactReply_contactMessageId_idx" ON "ContactReply"("contactMessageId");
CREATE INDEX "ContactReply_isFromUser_idx" ON "ContactReply"("isFromUser");
CREATE INDEX "ContactReply_isInternal_idx" ON "ContactReply"("isInternal");
CREATE INDEX "ContactReply_createdAt_idx" ON "ContactReply"("createdAt");
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "bypassEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "acceptedAt" DATETIME,
    "acceptedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("bypassEmailVerification", "createdAt", "email", "expiresAt", "id", "invitedByUserId", "role", "status", "tenantId", "token") SELECT "bypassEmailVerification", "createdAt", "email", "expiresAt", "id", "invitedByUserId", "role", "status", "tenantId", "token" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_tenantId_idx" ON "Invitation"("tenantId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
CREATE INDEX "Invitation_createdAt_idx" ON "Invitation"("createdAt");
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "permissions" TEXT,
    "invitedByUserId" TEXT,
    "invitationAcceptedAt" DATETIME,
    "lastActiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("createdAt", "id", "invitationAcceptedAt", "invitedByUserId", "role", "tenantId", "userId") SELECT "createdAt", "id", "invitationAcceptedAt", "invitedByUserId", "role", "tenantId", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_role_idx" ON "Membership"("role");
CREATE INDEX "Membership_status_idx" ON "Membership"("status");
CREATE INDEX "Membership_lastActiveAt_idx" ON "Membership"("lastActiveAt");
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("expires", "id", "sessionToken", "userId") SELECT "expires", "id", "sessionToken", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subdomain" TEXT,
    "customDomain" TEXT,
    "logoUrl" TEXT,
    "theme" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "invitePolicy" TEXT NOT NULL DEFAULT 'admin_only',
    "emailVerificationBypassEnabled" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "limits" TEXT,
    "featureFlags" TEXT,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoProvider" TEXT,
    "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "suspendedAt" DATETIME,
    "deletedAt" DATETIME
);
INSERT INTO "new_Tenant" ("createdAt", "customDomain", "emailVerificationBypassEnabled", "id", "invitePolicy", "limits", "locale", "logoUrl", "name", "plan", "slug", "status", "subdomain", "theme", "timezone", "updatedAt") SELECT "createdAt", "customDomain", "emailVerificationBypassEnabled", "id", "invitePolicy", "limits", "locale", "logoUrl", "name", "plan", "slug", "status", "subdomain", "theme", "timezone", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_subdomain_idx" ON "Tenant"("subdomain");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");
CREATE INDEX "Tenant_suspendedAt_idx" ON "Tenant"("suspendedAt");
CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "hashedPassword" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "platformRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerificationToken", "emailVerified", "hashedPassword", "id", "image", "isEmailVerified", "name", "passwordResetExpires", "passwordResetToken", "platformRole", "updatedAt") SELECT "createdAt", "email", "emailVerificationToken", "emailVerified", "hashedPassword", "id", "image", "isEmailVerified", "name", "passwordResetExpires", "passwordResetToken", "platformRole", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContactMessage_priority_idx" ON "ContactMessage"("priority");

-- CreateIndex
CREATE INDEX "ContactMessage_category_idx" ON "ContactMessage"("category");

-- CreateIndex
CREATE INDEX "ContactMessage_assignedTo_idx" ON "ContactMessage"("assignedTo");

-- CreateIndex
CREATE INDEX "ContactMessage_resolvedAt_idx" ON "ContactMessage"("resolvedAt");
