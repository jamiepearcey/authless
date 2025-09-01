-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "platformRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "activityUpdates" BOOLEAN NOT NULL DEFAULT false,
    "notifySupportRepliesUI" BOOLEAN NOT NULL DEFAULT true,
    "notifySupportRepliesEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
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
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSsoConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enforceSSO" BOOLEAN NOT NULL DEFAULT false,
    "samlEntityId" TEXT,
    "samlSsoUrl" TEXT,
    "samlSloUrl" TEXT,
    "samlCertificate" TEXT,
    "samlSigningCert" TEXT,
    "samlNameIdFormat" TEXT,
    "samlAttributeMapping" JSONB,
    "oidcIssuer" TEXT,
    "oidcClientId" TEXT,
    "oidcClientSecret" TEXT,
    "oidcScopes" TEXT,
    "oidcTokenEndpoint" TEXT,
    "oidcAuthEndpoint" TEXT,
    "oidcUserinfoEndpoint" TEXT,
    "oidcJwksUri" TEXT,
    "oauth2ClientId" TEXT,
    "oauth2ClientSecret" TEXT,
    "oauth2AuthUrl" TEXT,
    "oauth2TokenUrl" TEXT,
    "oauth2UserInfoUrl" TEXT,
    "oauth2Scopes" TEXT,
    "autoProvisionUsers" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" TEXT NOT NULL DEFAULT 'member',
    "allowedDomains" TEXT,
    "userAttributeMapping" JSONB,
    "signAssertions" BOOLEAN NOT NULL DEFAULT true,
    "signRequests" BOOLEAN NOT NULL DEFAULT false,
    "encryptAssertions" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER DEFAULT 480,
    "lastSyncAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "totalLogins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "TenantSsoConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsoAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "samlRequestId" TEXT,
    "samlResponseId" TEXT,
    "errorMessage" TEXT,
    "attributes" JSONB,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "permissions" TEXT,
    "invitedByUserId" TEXT,
    "invitationAcceptedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "bypassEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactReason" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "helpType" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedTo" TEXT,
    "category" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "tags" TEXT,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessageReason" (
    "id" TEXT NOT NULL,
    "contactMessageId" TEXT NOT NULL,
    "contactReasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessageReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactReply" (
    "id" TEXT NOT NULL,
    "contactMessageId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromUser" BOOLEAN NOT NULL DEFAULT false,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signCount" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "backupEligible" BOOLEAN NOT NULL DEFAULT false,
    "backupState" BOOLEAN NOT NULL DEFAULT false,
    "userVerification" TEXT NOT NULL DEFAULT 'preferred',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticatorCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticatorCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'unread',
    "tenantId" TEXT,
    "role" TEXT,
    "userId" TEXT,
    "metadata" TEXT,
    "expiresAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "FeatureDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFeatureRule" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "GlobalFeatureRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantFeatureRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "TenantFeatureRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureAuditEntry" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tenantId" TEXT,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "FeatureAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" TEXT,
    "contextSnapshot" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "identifier" TEXT,
    "secret" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "TwoFactorMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "nonce" TEXT NOT NULL,
    "requiredFactors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PendingAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "traceId" TEXT,

    CONSTRAINT "TwoFactorCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "factorType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "contactMessageId" TEXT,
    "caseNumberSeq" BIGSERIAL NOT NULL,
    "caseNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assigneeId" TEXT,
    "tenantId" TEXT,
    "supportOptionId" TEXT,
    "threadingKey" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CONTACT_FORM',
    "sourceMetadata" JSONB,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportOption" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "parentOptionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "routingConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "contactReplyId" TEXT,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "messageId" TEXT,
    "threadingData" JSONB,
    "attachments" JSONB,
    "deliveryStatus" TEXT DEFAULT 'PENDING',
    "deliveryMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "date" DATE NOT NULL,
    "supportOptionId" TEXT,
    "assigneeId" TEXT,
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "openCases" INTEGER NOT NULL DEFAULT 0,
    "pendingCases" INTEGER NOT NULL DEFAULT 0,
    "resolvedCases" INTEGER NOT NULL DEFAULT 0,
    "closedCases" INTEGER NOT NULL DEFAULT 0,
    "avgFirstResponseTime" INTEGER,
    "avgResolutionTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" BIGSERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_subdomain_idx" ON "Tenant"("subdomain");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE INDEX "Tenant_suspendedAt_idx" ON "Tenant"("suspendedAt");

-- CreateIndex
CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSsoConfiguration_tenantId_key" ON "TenantSsoConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSsoConfiguration_tenantId_idx" ON "TenantSsoConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSsoConfiguration_provider_idx" ON "TenantSsoConfiguration"("provider");

-- CreateIndex
CREATE INDEX "TenantSsoConfiguration_isEnabled_idx" ON "TenantSsoConfiguration"("isEnabled");

-- CreateIndex
CREATE INDEX "SsoAuditLog_tenantId_idx" ON "SsoAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "SsoAuditLog_userId_idx" ON "SsoAuditLog"("userId");

-- CreateIndex
CREATE INDEX "SsoAuditLog_event_idx" ON "SsoAuditLog"("event");

-- CreateIndex
CREATE INDEX "SsoAuditLog_provider_idx" ON "SsoAuditLog"("provider");

-- CreateIndex
CREATE INDEX "SsoAuditLog_createdAt_idx" ON "SsoAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_role_idx" ON "Membership"("role");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_lastActiveAt_idx" ON "Membership"("lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_tenantId_idx" ON "Invitation"("tenantId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_createdAt_idx" ON "Invitation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactReason_key_key" ON "ContactReason"("key");

-- CreateIndex
CREATE INDEX "ContactReason_tenantId_idx" ON "ContactReason"("tenantId");

-- CreateIndex
CREATE INDEX "ContactReason_isActive_idx" ON "ContactReason"("isActive");

-- CreateIndex
CREATE INDEX "ContactReason_sortOrder_idx" ON "ContactReason"("sortOrder");

-- CreateIndex
CREATE INDEX "ContactReason_helpType_idx" ON "ContactReason"("helpType");

-- CreateIndex
CREATE INDEX "ContactMessage_userId_idx" ON "ContactMessage"("userId");

-- CreateIndex
CREATE INDEX "ContactMessage_tenantId_idx" ON "ContactMessage"("tenantId");

-- CreateIndex
CREATE INDEX "ContactMessage_status_idx" ON "ContactMessage"("status");

-- CreateIndex
CREATE INDEX "ContactMessage_priority_idx" ON "ContactMessage"("priority");

-- CreateIndex
CREATE INDEX "ContactMessage_category_idx" ON "ContactMessage"("category");

-- CreateIndex
CREATE INDEX "ContactMessage_assignedTo_idx" ON "ContactMessage"("assignedTo");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_resolvedAt_idx" ON "ContactMessage"("resolvedAt");

-- CreateIndex
CREATE INDEX "ContactMessageReason_contactMessageId_idx" ON "ContactMessageReason"("contactMessageId");

-- CreateIndex
CREATE INDEX "ContactMessageReason_contactReasonId_idx" ON "ContactMessageReason"("contactReasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactMessageReason_contactMessageId_contactReasonId_key" ON "ContactMessageReason"("contactMessageId", "contactReasonId");

-- CreateIndex
CREATE INDEX "ContactReply_contactMessageId_idx" ON "ContactReply"("contactMessageId");

-- CreateIndex
CREATE INDEX "ContactReply_isFromUser_idx" ON "ContactReply"("isFromUser");

-- CreateIndex
CREATE INDEX "ContactReply_isInternal_idx" ON "ContactReply"("isInternal");

-- CreateIndex
CREATE INDEX "ContactReply_createdAt_idx" ON "ContactReply"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Passkey_credentialId_idx" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_isActive_idx" ON "Passkey"("isActive");

-- CreateIndex
CREATE INDEX "Passkey_lastUsedAt_idx" ON "Passkey"("lastUsedAt");

-- CreateIndex
CREATE INDEX "Passkey_createdAt_idx" ON "Passkey"("createdAt");

-- CreateIndex
CREATE INDEX "AuthenticatorCode_userId_idx" ON "AuthenticatorCode"("userId");

-- CreateIndex
CREATE INDEX "AuthenticatorCode_isActive_idx" ON "AuthenticatorCode"("isActive");

-- CreateIndex
CREATE INDEX "AuthenticatorCode_createdAt_idx" ON "AuthenticatorCode"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_role_idx" ON "Notification"("role");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_readAt_idx" ON "NotificationRecipient"("readAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_createdAt_idx" ON "NotificationRecipient"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_tenantId_idx" ON "WebhookEndpoint"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_isActive_idx" ON "WebhookEndpoint"("isActive");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_lastTriggeredAt_idx" ON "WebhookEndpoint"("lastTriggeredAt");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_createdAt_idx" ON "WebhookEndpoint"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureDefinition_key_key" ON "FeatureDefinition"("key");

-- CreateIndex
CREATE INDEX "FeatureDefinition_tier_idx" ON "FeatureDefinition"("tier");

-- CreateIndex
CREATE INDEX "FeatureDefinition_defaultEnabled_idx" ON "FeatureDefinition"("defaultEnabled");

-- CreateIndex
CREATE INDEX "FeatureDefinition_createdAt_idx" ON "FeatureDefinition"("createdAt");

-- CreateIndex
CREATE INDEX "GlobalFeatureRule_enabled_idx" ON "GlobalFeatureRule"("enabled");

-- CreateIndex
CREATE INDEX "GlobalFeatureRule_createdAt_idx" ON "GlobalFeatureRule"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFeatureRule_featureKey_key" ON "GlobalFeatureRule"("featureKey");

-- CreateIndex
CREATE INDEX "TenantFeatureRule_tenantId_idx" ON "TenantFeatureRule"("tenantId");

-- CreateIndex
CREATE INDEX "TenantFeatureRule_enabled_idx" ON "TenantFeatureRule"("enabled");

-- CreateIndex
CREATE INDEX "TenantFeatureRule_createdAt_idx" ON "TenantFeatureRule"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureRule_tenantId_featureKey_key" ON "TenantFeatureRule"("tenantId", "featureKey");

-- CreateIndex
CREATE INDEX "FeatureAuditEntry_featureKey_idx" ON "FeatureAuditEntry"("featureKey");

-- CreateIndex
CREATE INDEX "FeatureAuditEntry_scope_idx" ON "FeatureAuditEntry"("scope");

-- CreateIndex
CREATE INDEX "FeatureAuditEntry_tenantId_idx" ON "FeatureAuditEntry"("tenantId");

-- CreateIndex
CREATE INDEX "FeatureAuditEntry_createdAt_idx" ON "FeatureAuditEntry"("createdAt");

-- CreateIndex
CREATE INDEX "FeatureAuditEntry_createdBy_idx" ON "FeatureAuditEntry"("createdBy");

-- CreateIndex
CREATE INDEX "SetupState_isCompleted_idx" ON "SetupState"("isCompleted");

-- CreateIndex
CREATE INDEX "SetupState_completedAt_idx" ON "SetupState"("completedAt");

-- CreateIndex
CREATE INDEX "TwoFactorMethod_userId_idx" ON "TwoFactorMethod"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorMethod_type_idx" ON "TwoFactorMethod"("type");

-- CreateIndex
CREATE INDEX "TwoFactorMethod_tenantId_idx" ON "TwoFactorMethod"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorMethod_userId_type_tenantId_key" ON "TwoFactorMethod"("userId", "type", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingAuth_nonce_key" ON "PendingAuth"("nonce");

-- CreateIndex
CREATE INDEX "PendingAuth_userId_idx" ON "PendingAuth"("userId");

-- CreateIndex
CREATE INDEX "PendingAuth_nonce_idx" ON "PendingAuth"("nonce");

-- CreateIndex
CREATE INDEX "PendingAuth_expiresAt_idx" ON "PendingAuth"("expiresAt");

-- CreateIndex
CREATE INDEX "PendingAuth_tenantId_idx" ON "PendingAuth"("tenantId");

-- CreateIndex
CREATE INDEX "TwoFactorCode_userId_idx" ON "TwoFactorCode"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorCode_type_idx" ON "TwoFactorCode"("type");

-- CreateIndex
CREATE INDEX "TwoFactorCode_purpose_idx" ON "TwoFactorCode"("purpose");

-- CreateIndex
CREATE INDEX "TwoFactorCode_expiresAt_idx" ON "TwoFactorCode"("expiresAt");

-- CreateIndex
CREATE INDEX "TwoFactorCode_tenantId_idx" ON "TwoFactorCode"("tenantId");

-- CreateIndex
CREATE INDEX "TwoFactorCode_traceId_idx" ON "TwoFactorCode"("traceId");

-- CreateIndex
CREATE INDEX "TwoFactorAudit_userId_idx" ON "TwoFactorAudit"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorAudit_action_idx" ON "TwoFactorAudit"("action");

-- CreateIndex
CREATE INDEX "TwoFactorAudit_factorType_idx" ON "TwoFactorAudit"("factorType");

-- CreateIndex
CREATE INDEX "TwoFactorAudit_createdAt_idx" ON "TwoFactorAudit"("createdAt");

-- CreateIndex
CREATE INDEX "TwoFactorAudit_tenantId_idx" ON "TwoFactorAudit"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_contactMessageId_key" ON "SupportCase"("contactMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_caseNumberSeq_key" ON "SupportCase"("caseNumberSeq");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_caseNumber_key" ON "SupportCase"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_threadingKey_key" ON "SupportCase"("threadingKey");

-- CreateIndex
CREATE INDEX "SupportCase_status_idx" ON "SupportCase"("status");

-- CreateIndex
CREATE INDEX "SupportCase_assigneeId_idx" ON "SupportCase"("assigneeId");

-- CreateIndex
CREATE INDEX "SupportCase_tenantId_idx" ON "SupportCase"("tenantId");

-- CreateIndex
CREATE INDEX "SupportCase_threadingKey_idx" ON "SupportCase"("threadingKey");

-- CreateIndex
CREATE INDEX "SupportCase_createdAt_idx" ON "SupportCase"("createdAt");

-- CreateIndex
CREATE INDEX "SupportCase_source_idx" ON "SupportCase"("source");

-- CreateIndex
CREATE INDEX "SupportCase_priority_idx" ON "SupportCase"("priority");

-- CreateIndex
CREATE INDEX "SupportOption_tenantId_idx" ON "SupportOption"("tenantId");

-- CreateIndex
CREATE INDEX "SupportOption_isActive_idx" ON "SupportOption"("isActive");

-- CreateIndex
CREATE INDEX "SupportOption_parentOptionId_idx" ON "SupportOption"("parentOptionId");

-- CreateIndex
CREATE INDEX "SupportOption_sortOrder_idx" ON "SupportOption"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOption_key_key" ON "SupportOption"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOption_tenantId_key_key" ON "SupportOption"("tenantId", "key");

-- CreateIndex
CREATE INDEX "CaseMessage_caseId_idx" ON "CaseMessage"("caseId");

-- CreateIndex
CREATE INDEX "CaseMessage_createdAt_idx" ON "CaseMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CaseMessage_direction_idx" ON "CaseMessage"("direction");

-- CreateIndex
CREATE INDEX "CaseMessage_messageId_idx" ON "CaseMessage"("messageId");

-- CreateIndex
CREATE INDEX "CaseMessage_channel_idx" ON "CaseMessage"("channel");

-- CreateIndex
CREATE INDEX "CaseMessage_deliveryStatus_idx" ON "CaseMessage"("deliveryStatus");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_idx" ON "CaseStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_createdAt_idx" ON "CaseStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_toStatus_idx" ON "CaseStatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "CaseMetrics_date_idx" ON "CaseMetrics"("date");

-- CreateIndex
CREATE INDEX "CaseMetrics_tenantId_idx" ON "CaseMetrics"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMetrics_tenantId_date_supportOptionId_assigneeId_key" ON "CaseMetrics"("tenantId", "date", "supportOptionId", "assigneeId");

-- CreateIndex
CREATE INDEX "SupportConfiguration_tenantId_idx" ON "SupportConfiguration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportConfiguration_key_key" ON "SupportConfiguration"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SupportConfiguration_tenantId_key_key" ON "SupportConfiguration"("tenantId", "key");

-- CreateIndex
CREATE INDEX "TenantSupportRouting_tenantId_idx" ON "TenantSupportRouting"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSupportRouting_helpType_idx" ON "TenantSupportRouting"("helpType");

-- CreateIndex
CREATE INDEX "TenantSupportRouting_isActive_idx" ON "TenantSupportRouting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSupportRouting_tenantId_helpType_key" ON "TenantSupportRouting"("tenantId", "helpType");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_idx" ON "OutboxEvent"("tenantId");

-- CreateIndex
CREATE INDEX "OutboxEvent_eventType_idx" ON "OutboxEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_timestamp_idx" ON "AuditEvent"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_timestamp_idx" ON "AuditEvent"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_timestamp_idx" ON "AuditEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_timestamp_idx" ON "AuditEvent"("actorId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditEvent_actionOutcome_timestamp_idx" ON "AuditEvent"("actionOutcome", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSsoConfiguration" ADD CONSTRAINT "TenantSsoConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoAuditLog" ADD CONSTRAINT "SsoAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoAuditLog" ADD CONSTRAINT "SsoAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactReason" ADD CONSTRAINT "ContactReason_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessageReason" ADD CONSTRAINT "ContactMessageReason_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessageReason" ADD CONSTRAINT "ContactMessageReason_contactReasonId_fkey" FOREIGN KEY ("contactReasonId") REFERENCES "ContactReason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactReply" ADD CONSTRAINT "ContactReply_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticatorCode" ADD CONSTRAINT "AuthenticatorCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFeatureRule" ADD CONSTRAINT "GlobalFeatureRule_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "FeatureDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureRule" ADD CONSTRAINT "TenantFeatureRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureRule" ADD CONSTRAINT "TenantFeatureRule_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "FeatureDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureAuditEntry" ADD CONSTRAINT "FeatureAuditEntry_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "FeatureDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureAuditEntry" ADD CONSTRAINT "FeatureAuditEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorMethod" ADD CONSTRAINT "TwoFactorMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorMethod" ADD CONSTRAINT "TwoFactorMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAuth" ADD CONSTRAINT "PendingAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAuth" ADD CONSTRAINT "PendingAuth_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorCode" ADD CONSTRAINT "TwoFactorCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorCode" ADD CONSTRAINT "TwoFactorCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAudit" ADD CONSTRAINT "TwoFactorAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAudit" ADD CONSTRAINT "TwoFactorAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_supportOptionId_fkey" FOREIGN KEY ("supportOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportOption" ADD CONSTRAINT "SupportOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportOption" ADD CONSTRAINT "SupportOption_parentOptionId_fkey" FOREIGN KEY ("parentOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_contactReplyId_fkey" FOREIGN KEY ("contactReplyId") REFERENCES "ContactReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMetrics" ADD CONSTRAINT "CaseMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMetrics" ADD CONSTRAINT "CaseMetrics_supportOptionId_fkey" FOREIGN KEY ("supportOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMetrics" ADD CONSTRAINT "CaseMetrics_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConfiguration" ADD CONSTRAINT "SupportConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSupportRouting" ADD CONSTRAINT "TenantSupportRouting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
