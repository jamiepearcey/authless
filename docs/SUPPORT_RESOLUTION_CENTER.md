# Support Resolution Center - Implementation Guide

## Overview

The Support Resolution Center upgrades the existing Contact + conversation history into a comprehensive support system that enables admins to define routing options, users to track resolution status, and the system to deliver notifications via n8n integration.

## Architecture

### Core Components

1. **Database Schema Extensions**: New models built on existing ContactMessage system
2. **tRPC API Endpoints**: Complete CRUD operations for cases and support options  
3. **n8n Webhook Integration**: Provider-agnostic messaging with threading
4. **Notifications System**: Extended with UI/EMAIL visibility modes
5. **Case Lifecycle Service**: Automated case creation and routing
6. **Frontend Components**: Cases management UI

### Key Design Principles

- **Backward Compatibility**: Existing contact flow continues unchanged
- **Provider Agnostic**: All external communication through n8n
- **Extensible Routing**: Email, webhook, and tenant-default options
- **Audit Trail**: Complete logging and status history
- **Performance Optimized**: Pre-aggregated metrics and proper indexing

## Database Schema

### New Models

#### SupportCase
```typescript
model SupportCase {
  id                String    @id @default(cuid())
  contactMessageId  String?   @unique // Link to existing ContactMessage
  caseNumber        String    @unique // Human-readable case number
  title             String    // Case title
  description       String?   // Extended description
  status            String    @default("OPEN") // OPEN, PENDING, RESOLVED, CLOSED
  priority          String    @default("NORMAL") // LOW, NORMAL, HIGH, URGENT
  assigneeId        String?   // Optional assignee
  tenantId          String?   // Tenant context
  supportOptionId   String?   // Support option used
  threadingKey      String?   @unique // Stable key for message threading
  source            String    @default("CONTACT_FORM") // Source type
  sourceMetadata    Json?     // Provider-specific metadata
  // ... timestamps and relations
}
```

#### SupportOption
```typescript
model SupportOption {
  id               String    @id @default(cuid())
  key              String    // Unique key (e.g., 'billing')
  label            String    // Display name
  description      String?   // Help text
  isActive         Boolean   @default(true)
  isGlobal         Boolean   @default(true) // Platform vs tenant
  tenantId         String?   // NULL for global options
  parentOptionId   String?   // For tenant overrides
  routingConfig    Json      // Routing configuration
  // ... other fields
}
```

#### CaseMessage  
```typescript
model CaseMessage {
  id                String    @id @default(cuid())
  caseId            String
  direction         String    // INBOUND, OUTBOUND
  channel           String    // EMAIL, SMS, WHATSAPP, UI, SYSTEM
  content           String
  messageId         String?   // Provider message ID for deduplication
  threadingData     Json?     // Threading metadata
  deliveryStatus    String?   @default("PENDING")
  // ... other fields
}
```

### Extended Models

#### User
```typescript
// Added support notification preferences
notifySupportRepliesUI      Boolean @default(true)
notifySupportRepliesEmail   Boolean @default(true)
```

## API Endpoints

### Support Cases (`supportCaseRouter`)

- `getAllCases`: Get cases with filtering and pagination
- `getCaseById`: Get single case with full details 
- `createCase`: Create new case (admin)
- `updateCaseStatus`: Update case status with audit trail
- `assignCase`: Assign case to user
- `addCaseMessage`: Add message to case thread
- `getCaseMessages`: Get case message thread
- `getCaseMetrics`: Get analytics data
- `convertContactMessageToCase`: Convert existing contact to case

### Support Options (`supportOptionRouter`)

#### Global Options (Platform Admin)
- `getGlobalSupportOptions`: List all global options
- `createGlobalSupportOption`: Create new global option
- `updateGlobalSupportOption`: Update global option
- `deleteGlobalSupportOption`: Delete global option

#### Tenant Options (Tenant Admin)  
- `getTenantSupportOptions`: Get merged options (global + tenant)
- `createTenantSupportOption`: Create tenant-specific option
- `updateTenantSupportOption`: Update tenant option
- `deleteTenantSupportOption`: Delete tenant option

#### Public
- `getAvailableSupportOptions`: Get options for contact form
- `testSupportOptionRouting`: Test routing configuration

### n8n Integration (`n8nWebhookRouter`)

- `receiveInboundMessage`: Process inbound messages with deduplication
- `sendOutboundMessage`: Send messages via n8n
- `updateDeliveryStatus`: Handle delivery status updates
- `configureN8nWebhooks`: Configure webhook settings
- `getN8nConfiguration`: Get current configuration

### Notifications (`supportNotificationsRouter`)

- `createSupportNotification`: Create notification with visibility modes
- `getUserSupportNotificationPreferences`: Get user preferences
- `updateUserSupportNotificationPreferences`: Update preferences
- `notifyCaseParticipants`: Bulk notify case stakeholders

## Routing Configuration

### Email Routing
```json
{
  "type": "email",
  "addresses": ["support@example.com", "billing@example.com"]
}
```

### Webhook Routing
```json
{
  "type": "webhook", 
  "url": "https://external-system.com/webhook",
  "method": "POST",
  "headers": {"Authorization": "Bearer token"},
  "authentication": {
    "type": "bearer",
    "token": "secret-token"
  }
}
```

### Tenant Default Routing
```json
{
  "type": "tenant_default",
  "fallbackEmail": "admin@tenant.com"
}
```

## Case Lifecycle

### Automatic Case Creation

1. **Contact Form Submission**: 
   - Contact message created as before
   - `SupportCaseService.createCaseFromContactMessage()` called automatically
   - Support option determined from contact reasons
   - Case routed based on option configuration

2. **Inbound Message via n8n**:
   - Message processed through `receiveInboundMessage` webhook
   - Threading key used to match existing case or create new
   - Case messages linked to support cases

### Status Transitions

- **OPEN**: New case, awaiting first response
- **PENDING**: Waiting for customer reply or external dependency  
- **RESOLVED**: Issue resolved, awaiting customer confirmation
- **CLOSED**: Case completed and closed

### Auto-Assignment Rules

```typescript
// Round-robin assignment
{
  "type": "round_robin"
}

// Least busy assignment
{
  "type": "least_busy"  
}

// Support option mapping
{
  "type": "support_option",
  "mappings": {
    "billing": "user-id-1",
    "technical": "user-id-2"
  }
}
```

## Notifications System

### Visibility Modes

- **UI**: Show only in notification bar/page
- **EMAIL**: Send via n8n only, no UI notification
- **BOTH**: Send both UI and email notifications

### User Preferences

- `notifySupportRepliesUI`: Receive UI notifications for support replies
- `notifySupportRepliesEmail`: Receive email notifications for support replies

### Email-Only Fallback Policy

When `EMAIL` visibility is set but user has email disabled:
- Check `emailOnlyFallbackToUI` configuration
- If `true`: Send UI notification and log fallback
- If `false`: Suppress notification entirely

## n8n Integration

### Webhook Security

All webhooks use HMAC SHA-256 signature verification:

```typescript
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", ""), "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}
```

### Message Threading

Threading keys ensure message continuity across channels:

```typescript
function generateThreadingKey(data: {
  source: string;
  identifier: string; // email message-id, sms thread, etc.
  fallback?: string;
}): string {
  const { source, identifier, fallback } = data;
  const base = identifier || fallback || crypto.randomUUID();
  return `${source}:${crypto.createHash("md5").update(base).digest("hex")}`;
}
```

### Deduplication

Messages deduplicated using provider message IDs:

```sql
SELECT * FROM CaseMessage WHERE messageId = ? AND channel = ?
```

## Frontend Components

### Cases List (`/support/cases`)

- Tabbed interface (All, Open, Pending, Resolved, Closed)
- Advanced filtering and search
- Pagination with metrics dashboard
- Status/priority badges with assignee info

### Case Detail (`/support/cases/[id]`)

- Full case information with customer details
- Threaded message history with direction indicators
- Reply composer with internal notes option
- Status update controls and assignment
- Sidebar with case properties and status history

### Contact Form Integration

Existing contact form continues to work unchanged - cases are automatically created in the background.

## Configuration

### Required Environment Variables

```env
# n8n Integration
N8N_WEBHOOK_SECRET=your-webhook-secret-32-chars-min
N8N_INBOUND_WEBHOOK_URL=https://your-n8n.com/webhook/inbound
N8N_OUTBOUND_WEBHOOK_URL=https://your-n8n.com/webhook/outbound
N8N_DELIVERY_WEBHOOK_URL=https://your-n8n.com/webhook/delivery
```

### System Configuration

Use the `SupportConfiguration` table for runtime configuration:

```sql
INSERT INTO SupportConfiguration (key, value, description) VALUES
('defaultTenantId', '""', 'Default tenant for routing when tenant cannot be determined'),
('emailOnlyFallbackToUI', 'true', 'Whether to fallback to UI notifications when email is disabled'),
('caseNumberPrefix', '"CASE"', 'Prefix for case numbers'),
('autoAssignmentRule', '{"type": "round_robin"}', 'Auto-assignment configuration');
```

## Migration Guide

### Database Migration

1. **Run Prisma Migration**:
   ```bash
   npx prisma migrate dev --name add_support_resolution_center
   ```

2. **Seed Default Support Options**:
   ```sql
   INSERT INTO SupportOption (key, label, description, icon, isGlobal, routingConfig, sortOrder) VALUES
   ('general', 'General Inquiry', 'General questions and support requests', 'HelpCircle', true, '{"type": "email", "addresses": ["support@example.com"]}', 10),
   ('technical', 'Technical Support', 'Technical issues and bug reports', 'Bug', true, '{"type": "email", "addresses": ["tech@example.com"]}', 20),
   ('billing', 'Billing & Account', 'Billing questions and account issues', 'CreditCard', true, '{"type": "email", "addresses": ["billing@example.com"]}', 30);
   ```

### Existing Data

- **ContactMessage records**: Remain unchanged and accessible
- **New cases**: Auto-created from new contact submissions
- **Historical data**: Can be converted using `convertContactMessageToCase` endpoint

### n8n Workflow Setup

1. **Configure Webhooks**: Use `configureN8nWebhooks` endpoint
2. **Set up n8n workflows** for email/SMS/WhatsApp processing
3. **Test routing**: Use `testSupportOptionRouting` endpoint

## Monitoring & Analytics

### Metrics Available

- Total cases by status/priority/assignee
- Average first response time
- Average resolution time  
- Case volume trends
- Routing effectiveness

### Audit Logging

All key actions are logged in the `AuditLog` table:

- Case creation/status changes
- Message routing decisions
- Notification delivery outcomes
- Configuration changes

### Health Checks

Monitor these endpoints for system health:

- n8n webhook connectivity
- Database query performance on case queries
- Notification delivery success rates
- Case creation success rate from contact forms

## Best Practices

### Performance

- Use pagination for case lists
- Index frequently queried fields (status, assignee, tenant)
- Pre-aggregate metrics using `CaseMetrics` table
- Cache support options for contact forms

### Security

- Always verify webhook signatures
- Rate limit inbound webhooks per tenant/user
- Sanitize user input in case messages
- Use proper RBAC for case access

### User Experience

- Provide clear status indicators
- Show case history for transparency
- Enable bulk operations for admins
- Maintain threading across channels

### Scalability

- Queue long-running operations (routing, notifications)
- Use background jobs for metrics aggregation
- Implement proper caching for frequently accessed data
- Consider database sharding for high-volume tenants

## Troubleshooting

### Common Issues

1. **Cases not auto-creating from contact forms**:
   - Check `SupportCaseService` logs
   - Verify contact reasons exist and are active
   - Ensure support options are configured

2. **n8n webhooks failing**:
   - Verify webhook signatures
   - Check timestamp validation (5-minute window)
   - Confirm webhook URLs in configuration

3. **Messages not threading correctly**:
   - Check `threadingKey` generation
   - Verify provider message IDs are unique
   - Review `CaseMessage.threadingData` for clues

4. **Notifications not delivering**:
   - Check user notification preferences
   - Verify Centrifugo connection for UI notifications
   - Review email service configuration
   - Check fallback policy settings

### Debug Queries

```sql
-- Find cases without threading keys
SELECT id, caseNumber, source FROM SupportCase WHERE threadingKey IS NULL;

-- Check duplicate message IDs
SELECT messageId, channel, COUNT(*) FROM CaseMessage GROUP BY messageId, channel HAVING COUNT(*) > 1;

-- Review failed notification deliveries
SELECT * FROM AuditLog WHERE action LIKE '%notification%' AND severity = 'error';

-- Check routing configuration
SELECT key, label, routingConfig FROM SupportOption WHERE isActive = true;
```

This completes the Support Resolution Center implementation. The system provides a comprehensive, scalable solution while maintaining backward compatibility with existing functionality.