-- Support Resolution Center Database Schema Extension
-- Builds on existing ContactMessage, ContactReason, ContactReply, and Notification models

-- ==========================================
-- 1. CASES - Resolution lifecycle management
-- ==========================================

-- Support Cases - represents resolved lifecycle for each support interaction
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "contactMessageId" TEXT UNIQUE, -- Link to existing ContactMessage (nullable for cases created from inbound)
    "caseNumber" TEXT NOT NULL UNIQUE, -- Human-readable case number (e.g., "CASE-2024-001")
    "title" TEXT NOT NULL, -- Case title (derived from contact subject or inbound message)
    "description" TEXT, -- Extended case description
    "status" TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, PENDING, RESOLVED, CLOSED
    "priority" TEXT NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    "assigneeId" TEXT, -- Optional assignee (User.id)
    "tenantId" TEXT, -- Tenant context
    "supportOptionId" TEXT, -- Link to the support option used
    "threadingKey" TEXT UNIQUE, -- Stable key for threading messages (email Message-ID, SMS thread, etc.)
    "source" TEXT NOT NULL DEFAULT 'CONTACT_FORM', -- CONTACT_FORM, EMAIL, SMS, WHATSAPP, WEBHOOK
    "sourceMetadata" JSONB, -- Provider-specific metadata for threading/routing
    "firstResponseAt" TIMESTAMP,
    "resolvedAt" TIMESTAMP,
    "closedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_SupportCase_ContactMessage" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_SupportCase_User" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_SupportCase_Tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_SupportCase_SupportOption" FOREIGN KEY ("supportOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX "IDX_SupportCase_status" ON "SupportCase"("status");
CREATE INDEX "IDX_SupportCase_assignee" ON "SupportCase"("assigneeId");
CREATE INDEX "IDX_SupportCase_tenant" ON "SupportCase"("tenantId");
CREATE INDEX "IDX_SupportCase_threadingKey" ON "SupportCase"("threadingKey");
CREATE INDEX "IDX_SupportCase_created" ON "SupportCase"("createdAt");
CREATE UNIQUE INDEX "IDX_SupportCase_caseNumber" ON "SupportCase"("caseNumber");

-- ==========================================
-- 2. SUPPORT OPTIONS - Routing configuration
-- ==========================================

-- Support Options - defines routing targets and policies
CREATE TABLE "SupportOption" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "key" TEXT NOT NULL, -- Unique key for the option (e.g., 'billing', 'technical')
    "label" TEXT NOT NULL, -- Display name
    "description" TEXT, -- Help text for users
    "icon" TEXT, -- Icon name/class
    "isActive" Boolean NOT NULL DEFAULT true,
    "isGlobal" Boolean NOT NULL DEFAULT true, -- Platform-wide option vs tenant-specific
    "tenantId" TEXT, -- NULL for global options, set for tenant options
    "parentOptionId" TEXT, -- For tenant overrides of global options
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHidden" Boolean NOT NULL DEFAULT false, -- Hidden from user selection but available for routing
    "routingConfig" JSONB NOT NULL, -- Routing configuration (emails, webhooks, etc.)
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_SupportOption_Tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_SupportOption_Parent" FOREIGN KEY ("parentOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL
);

-- Unique constraints
CREATE UNIQUE INDEX "IDX_SupportOption_global_key" ON "SupportOption"("key") WHERE "tenantId" IS NULL;
CREATE UNIQUE INDEX "IDX_SupportOption_tenant_key" ON "SupportOption"("tenantId", "key") WHERE "tenantId" IS NOT NULL;

-- Indexes
CREATE INDEX "IDX_SupportOption_tenant" ON "SupportOption"("tenantId");
CREATE INDEX "IDX_SupportOption_active" ON "SupportOption"("isActive");
CREATE INDEX "IDX_SupportOption_parent" ON "SupportOption"("parentOptionId");

-- ==========================================
-- 3. CASE MESSAGES - Unified messaging thread
-- ==========================================

-- Case Messages - unified thread for all case communications
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT NOT NULL,
    "contactReplyId" TEXT, -- Link to existing ContactReply if applicable
    "direction" TEXT NOT NULL, -- INBOUND, OUTBOUND
    "channel" TEXT NOT NULL, -- EMAIL, SMS, WHATSAPP, UI, SYSTEM
    "fromAddress" TEXT, -- Email, phone number, user ID, etc.
    "toAddress" TEXT,
    "subject" TEXT, -- For email messages
    "content" TEXT NOT NULL,
    "isInternal" Boolean NOT NULL DEFAULT false, -- Internal notes vs customer-visible messages
    "messageId" TEXT, -- Provider-specific message ID for deduplication
    "threadingData" JSONB, -- Headers, references, etc. for threading
    "attachments" JSONB, -- Array of attachment metadata
    "deliveryStatus" TEXT DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, FAILED
    "deliveryMetadata" JSONB, -- Provider delivery receipts/errors
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_CaseMessage_SupportCase" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_CaseMessage_ContactReply" FOREIGN KEY ("contactReplyId") REFERENCES "ContactReply"("id") ON DELETE SET NULL
);

-- Indexes
CREATE INDEX "IDX_CaseMessage_case" ON "CaseMessage"("caseId");
CREATE INDEX "IDX_CaseMessage_created" ON "CaseMessage"("createdAt");
CREATE INDEX "IDX_CaseMessage_direction" ON "CaseMessage"("direction");
CREATE INDEX "IDX_CaseMessage_messageId" ON "CaseMessage"("messageId"); -- For deduplication
CREATE INDEX "IDX_CaseMessage_channel" ON "CaseMessage"("channel");

-- ==========================================
-- 4. USER PREFERENCES - Support notifications
-- ==========================================

-- Extend User table with support notification preferences
ALTER TABLE "User" ADD COLUMN "notifySupportRepliesUI" Boolean DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifySupportRepliesEmail" Boolean DEFAULT true;

-- ==========================================
-- 5. SYSTEM CONFIGURATION - Global policies
-- ==========================================

-- System Configuration for support policies
CREATE TABLE "SupportConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT, -- NULL for global config
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_SupportConfiguration_Tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Unique constraint for tenant-specific and global configs
CREATE UNIQUE INDEX "IDX_SupportConfiguration_global_key" ON "SupportConfiguration"("key") WHERE "tenantId" IS NULL;
CREATE UNIQUE INDEX "IDX_SupportConfiguration_tenant_key" ON "SupportConfiguration"("tenantId", "key") WHERE "tenantId" IS NOT NULL;

-- Index for queries
CREATE INDEX "IDX_SupportConfiguration_tenant" ON "SupportConfiguration"("tenantId");

-- ==========================================
-- 6. CASE STATUS HISTORY - Audit trail
-- ==========================================

-- Track case status changes for analytics and audit
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT, -- User.id who changed the status
    "reason" TEXT, -- Optional reason for the change
    "metadata" JSONB, -- Additional context
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_CaseStatusHistory_SupportCase" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_CaseStatusHistory_User" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Indexes
CREATE INDEX "IDX_CaseStatusHistory_case" ON "CaseStatusHistory"("caseId");
CREATE INDEX "IDX_CaseStatusHistory_created" ON "CaseStatusHistory"("createdAt");

-- ==========================================
-- 7. CASE METRICS - Analytics aggregations
-- ==========================================

-- Pre-aggregated metrics for dashboard performance
CREATE TABLE "CaseMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT,
    "date" DATE NOT NULL,
    "supportOptionId" TEXT,
    "assigneeId" TEXT,
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "openCases" INTEGER NOT NULL DEFAULT 0,
    "pendingCases" INTEGER NOT NULL DEFAULT 0,
    "resolvedCases" INTEGER NOT NULL DEFAULT 0,
    "closedCases" INTEGER NOT NULL DEFAULT 0,
    "avgFirstResponseTime" INTEGER, -- in minutes
    "avgResolutionTime" INTEGER, -- in minutes
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    
    CONSTRAINT "FK_CaseMetrics_Tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_CaseMetrics_SupportOption" FOREIGN KEY ("supportOptionId") REFERENCES "SupportOption"("id") ON DELETE SET NULL,
    CONSTRAINT "FK_CaseMetrics_User" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Unique constraint for metric aggregations
CREATE UNIQUE INDEX "IDX_CaseMetrics_unique" ON "CaseMetrics"("tenantId", "date", "supportOptionId", "assigneeId");

-- Indexes for queries
CREATE INDEX "IDX_CaseMetrics_date" ON "CaseMetrics"("date");
CREATE INDEX "IDX_CaseMetrics_tenant" ON "CaseMetrics"("tenantId");

-- ==========================================
-- 8. INITIAL DATA - Default configurations
-- ==========================================

-- Insert default support options (global)
INSERT INTO "SupportOption" ("key", "label", "description", "icon", "isGlobal", "routingConfig", "sortOrder") VALUES
('general', 'General Inquiry', 'General questions and support requests', 'HelpCircle', true, '{"type": "email", "addresses": ["support@example.com"]}', 10),
('technical', 'Technical Support', 'Technical issues and bug reports', 'Bug', true, '{"type": "email", "addresses": ["tech@example.com"]}', 20),
('billing', 'Billing & Account', 'Billing questions and account issues', 'CreditCard', true, '{"type": "email", "addresses": ["billing@example.com"]}', 30),
('security', 'Security & Privacy', 'Security concerns and privacy questions', 'Shield', true, '{"type": "email", "addresses": ["security@example.com"]}', 40);

-- Insert default system configuration
INSERT INTO "SupportConfiguration" ("key", "value", "description") VALUES
('defaultTenantId', '""', 'Default tenant for routing when tenant cannot be determined'),
('emailOnlyFallbackToUI', 'true', 'Whether to fallback to UI notifications when email is disabled'),
('caseNumberPrefix', '"CASE"', 'Prefix for case numbers'),
('caseNumberFormat', '"{prefix}-{year}-{sequence:000}"', 'Format for generating case numbers'),
('defaultAssignee', 'null', 'Default assignee for new cases (User.id)'),
('autoCloseResolvedAfterDays', '7', 'Days to wait before auto-closing resolved cases');

-- ==========================================
-- 9. FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    year_part TEXT;
    sequence_num INTEGER;
    case_number TEXT;
BEGIN
    -- Get configuration
    SELECT value::text FROM "SupportConfiguration" WHERE key = 'caseNumberPrefix' AND "tenantId" IS NULL INTO prefix;
    IF prefix IS NULL THEN prefix := 'CASE'; END IF;
    prefix := trim(prefix, '"');
    
    -- Current year
    year_part := extract(year FROM now())::text;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN "caseNumber" ~ ('^' || prefix || '-' || year_part || '-\d+$')
            THEN substring("caseNumber" FROM ('^' || prefix || '-' || year_part || '-(\d+)$'))::integer
            ELSE 0
        END
    ), 0) + 1
    FROM "SupportCase"
    INTO sequence_num;
    
    -- Format case number
    case_number := prefix || '-' || year_part || '-' || lpad(sequence_num::text, 3, '0');
    
    RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate case numbers
CREATE OR REPLACE FUNCTION trigger_generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."caseNumber" IS NULL OR NEW."caseNumber" = '' THEN
        NEW."caseNumber" = generate_case_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TRG_SupportCase_generate_number"
    BEFORE INSERT ON "SupportCase"
    FOR EACH ROW EXECUTE FUNCTION trigger_generate_case_number();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION trigger_case_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD."status" IS DISTINCT FROM NEW."status" THEN
        INSERT INTO "CaseStatusHistory" ("caseId", "fromStatus", "toStatus", "changedBy")
        VALUES (NEW."id", OLD."status", NEW."status", NULL); -- changedBy will be set by application
    END IF;
    
    -- Update timestamp fields based on status
    IF NEW."status" = 'RESOLVED' AND OLD."status" != 'RESOLVED' THEN
        NEW."resolvedAt" = now();
    END IF;
    
    IF NEW."status" = 'CLOSED' AND OLD."status" != 'CLOSED' THEN
        NEW."closedAt" = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TRG_SupportCase_status_history"
    AFTER UPDATE ON "SupportCase"
    FOR EACH ROW EXECUTE FUNCTION trigger_case_status_history();

-- ==========================================
-- 10. COMPATIBILITY VIEWS
-- ==========================================

-- View to maintain compatibility with existing contact system
CREATE VIEW "ContactMessageWithCase" AS
SELECT 
    cm.*,
    sc."id" as "caseId",
    sc."caseNumber",
    sc."status" as "caseStatus",
    sc."assigneeId" as "caseAssigneeId"
FROM "ContactMessage" cm
LEFT JOIN "SupportCase" sc ON sc."contactMessageId" = cm."id";

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE "SupportCase" IS 'Support cases with lifecycle management - extends ContactMessage with resolution tracking';
COMMENT ON TABLE "SupportOption" IS 'Configurable support routing options for platform and tenant admins';  
COMMENT ON TABLE "CaseMessage" IS 'Unified message thread for cases - links to ContactReply and external messages';
COMMENT ON TABLE "CaseStatusHistory" IS 'Audit trail for case status changes';
COMMENT ON TABLE "CaseMetrics" IS 'Pre-aggregated metrics for analytics and reporting';
COMMENT ON TABLE "SupportConfiguration" IS 'System-wide and tenant-specific configuration for support features';