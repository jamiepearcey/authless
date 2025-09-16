# Notification Service - Centralized Notification System

A comprehensive notification system that processes notification intents and orchestrates multi-channel delivery using NATS JetStream, Centrifugo, and PostgreSQL. This service handles both explicit notification intents and domain event-driven notifications with full tRPC integration.

## 🏗️ System Architecture

The notification system follows a **dual-input architecture** that supports both explicit notification requests and domain event-driven notifications:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   tRPC API      │    │   Outbox        │    │  Notification   │
│   (Explicit)    │───▶│   Service       │───▶│  Service        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│   Domain        │    │   Outbox        │           │
│   Events        │───▶│   Processor     │───────────┘
└─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           ▼
│   Centrifugo    │◀───│   Database      │    ┌─────────────────┐
│   (Realtime)    │    │   (PostgreSQL)  │    │   Email Service │
└─────────────────┘    └─────────────────┘    │   (JetStream)   │
                                                       └─────────────────┘
```

## 🚀 Key Features

### **Dual Input Processing**
- **Explicit Notifications**: Direct notification requests via tRPC API
- **Domain Events**: Automatic notification generation from business events
- **Event Mapping**: Configurable rules to map domain events to notifications

### **Multi-Channel Orchestration**
- **Realtime**: Direct WebSocket delivery via Centrifugo
- **Email**: Queued delivery via dedicated Email Service
- **SMS**: Queued delivery via future SMS Service
- **WhatsApp**: Queued delivery via future WhatsApp Service

### **User Preferences**
- **Channel Selection**: Users can enable/disable specific channels
- **Category Filtering**: Granular control over notification types
- **Quiet Hours**: Time-based notification suppression

### **Enterprise Features**
- **Idempotency**: Safe replay of messages
- **Retry Logic**: Configurable retry policies with exponential backoff
- **Dead Letter Queue**: Failed message handling
- **Audit Trail**: Complete notification history
- **Multi-tenant**: Full tenant isolation

## 📋 Database Schema

### **Core Tables**

```sql
-- Notification intents (explicit requests)
CREATE TABLE "NotificationIntent" (
  id              String   @id @default(cuid())
  tenantId        String?
  type            String   -- notification type
  recipients      Json     -- user IDs or role-based targeting
  payloadJson     Json     -- notification data
  status          String   -- pending|processing|completed|failed
  retryCount      Int      @default(0)
  maxRetries      Int      @default(3)
  traceId         String?
  idempotencyKey  String?  @unique
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  processedAt     DateTime?
  errorMessage    String?
);

-- Notifications (actual delivery records)
CREATE TABLE "Notification" (
  id                String   @id @default(cuid())
  tenantId          String?
  userId            String
  type              String
  title             String
  description       String?
  dataJson          Json?
  isAlert           Boolean  @default(false)
  emailOnly         Boolean  @default(false)
  templateId        String?
  templateVariables Json?
  createdAt         DateTime @default(now())
  readAt            DateTime?
  expiresAt         DateTime?
);

-- Delivery tracking per channel
CREATE TABLE "NotificationDelivery" (
  id             String   @id @default(cuid())
  notificationId String
  channel        String   -- realtime|email|sms|whatsapp
  status         String   -- pending|sent|failed
  tries          Int      @default(0)
  maxTries       Int      @default(3)
  lastError      String?
  sentAt         DateTime?
  metadata       Json?
);

-- User notification preferences
CREATE TABLE "NotificationPreferences" (
  id              String   @id @default(cuid())
  userId          String
  tenantId        String?
  type            String   -- notification type or wildcard
  channels        String[] @default(["realtime"])
  emailEnabled    Boolean  @default(true)
  realtimeEnabled Boolean  @default(true)
  smsEnabled      Boolean  @default(false)
  whatsappEnabled Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
);
```

## 🔄 Event Flow & Routing

### **1. Explicit Notification Flow**

```typescript
// 1. Client creates notification intent via tRPC
const intent = await trpc.notification.createNotificationIntent.mutate({
  type: 'support_reply',
  recipients: ['user123', 'user456'],
  payloadJson: {
    caseId: 'CSC-123',
    message: 'Your support case has been updated'
  },
  tenantId: 'tenant-abc'
});

// 2. tRPC publishes to outbox
await ctx.outbox.publishNotificationIntentEvent(
  'NOTIFICATION_INTENT_CREATED',
  intent.id,
  { /* intent data */ }
);

// 3. Outbox processor publishes to JetStream
// Subject: events.{tenantId}.notification_intent
// Payload: { eventName: 'NOTIFICATION_INTENT_CREATED', ... }

// 4. Realtime service consumes and processes
await this.handleNotificationIntent(event, ctx);
```

### **2. Domain Event Flow**

```typescript
// 1. Business logic publishes domain event
await ctx.outbox.publishTenantEvent(
  'SUPPORT_REPLY_CREATED',
  caseId,
  { caseId, message, userId, tenantId }
);

// 2. Outbox processor publishes to JetStream
// Subject: events.{tenantId}.support_reply_created
// Payload: { eventName: 'SUPPORT_REPLY_CREATED', ... }

// 3. Realtime service maps domain event to notification
const mapping = this.config.notificationConfig?.eventMappings?.['support_reply_created'];
if (mapping) {
  await this.handleDomainEvent(event, ctx);
}
```

### **3. Notification Processing**

```typescript
// 1. Resolve recipients
const userIds = await this.resolveRecipients(intent.recipients, intent.tenantId);

// 2. Get user preferences
for (const userId of userIds) {
  const preferences = await this.getUserNotificationPreferences(userId, intent.tenantId);
  
  // 3. Create notification record
  const notification = await this.createNotificationRecord({
    tenantId: intent.tenantId,
    userId,
    type: intent.type,
    title: this.generateNotificationTitle(intent),
    description: this.generateNotificationDescription(intent),
    dataJson: intent.payloadJson
  });

  // 4. Create delivery records for enabled channels
  await this.createDeliveryRecords(notification, preferences);
}
```

## 🛠️ Configuration

### **Service Configuration**

```typescript
import { RealtimeServiceConfig } from './abstractions';

const config: RealtimeServiceConfig = {
  // Service identity
  serviceName: 'realtime-service',
  version: '1.0.0',
  
  // NATS configuration
  natsUrl: 'nats://127.0.0.1:4222',
  streamName: 'EVENTS',
  consumerName: 'realtime_service',
  
  // Database configuration
  databaseUrl: 'postgresql://user:password@localhost:5432/db',
  
  // Centrifugo configuration
  centrifugoUrl: 'http://localhost:8000',
  centrifugoApiKey: 'your-api-key',
  
  // Channel routing configuration
  channels: [
    {
      pattern: 'user.{userId}.notifications',
      eventTypes: ['notification'],
      requireAuth: true,
    },
    {
      pattern: 'tenant.{tenantId}.notifications',
      eventTypes: ['notification'],
      requireAuth: true,
    },
    {
      pattern: 'system.{eventType}',
      eventTypes: ['maintenance', 'update', 'alert'],
      requireAuth: false,
    }
  ],
  
  // Notification processing configuration
  notificationConfig: {
    // Domain event to notification type mapping
    eventMappings: {
      'support_reply_created': {
        notificationType: 'support_reply',
        templateId: 'support-reply-template',
        conditions: (event) => event.payload.priority === 'high'
      },
      'payment_completed': {
        notificationType: 'payment_success',
        templateId: 'payment-success-template'
      },
      'user_invited': {
        notificationType: 'user_invitation',
        templateId: 'user-invitation-template'
      }
    },
    
    // Default notification preferences
    defaultPreferences: {
      channels: {
        web: true,
        email: true,
        mobile: false,
        desktop: false
      },
      categories: {
        'support': true,
        'payment': true,
        'security': true,
        'marketing': false
      }
    },
    
    // Template processing
    templateProcessing: true,
    
    // Delivery retry configuration
    deliveryRetryConfig: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000
    }
  }
};
```

## 🔌 tRPC Integration

### **Notification Intent API**

```typescript
// Create explicit notification intent
const intent = await trpc.notification.createNotificationIntent.mutate({
  type: 'support_reply',
  recipients: {
    type: 'role',
    ids: ['admin', 'support']
  },
  payloadJson: {
    caseId: 'CSC-123',
    message: 'New reply from support team',
    priority: 'high'
  },
  tenantId: 'tenant-abc',
  idempotencyKey: 'support-reply-123'
});

// Create direct notification
const notification = await trpc.notification.createNotification.mutate({
  title: 'System Maintenance',
  description: 'Scheduled maintenance in 1 hour',
  type: 'warning',
  priority: 'high',
  tenantId: 'tenant-abc',
  role: 'admin'
});
```

### **User Notification API**

```typescript
// Get user notifications
const { items, nextCursor } = await trpc.notification.getUserNotifications.query({
  limit: 20,
  status: 'unread',
  type: 'info',
  priority: 'high'
});

// Mark as read
await trpc.notification.markAsRead.mutate({
  notificationId: 'notif-123',
  userId: 'user-456'
});

// Get Centrifugo token for realtime connection
const { token, centrifugoUrl, channels } = await trpc.notification.getCentrifugoToken.mutate();
```

## 🎯 Channel Routing

### **Channel Patterns**

The service uses pattern-based channel routing to determine where notifications should be delivered:

```typescript
// User-specific notifications
{
  pattern: 'user.{userId}.notifications',
  eventTypes: ['notification'],
  requireAuth: true,
}

// Tenant-wide notifications
{
  pattern: 'tenant.{tenantId}.notifications',
  eventTypes: ['notification'],
  requireAuth: true,
}

// Role-based notifications
{
  pattern: 'role.{role}.notifications',
  eventTypes: ['notification'],
  requireAuth: true,
}

// System notifications
{
  pattern: 'system.{eventType}',
  eventTypes: ['maintenance', 'update', 'alert'],
  requireAuth: false,
}
```

### **Event Routing Logic**

```typescript
// 1. Event comes in with subject: events.tenant123.support_reply_created
const subject = ctx.subject || '';

if (subject.startsWith('notification.intent.')) {
  // Handle explicit notification intents
  await this.handleNotificationIntent(event, ctx);
} else if (subject.startsWith('events.')) {
  // Handle domain events from outbox
  await this.handleDomainEvent(event, ctx);
} else if (event.eventName === 'notification.created') {
  // Handle direct notification creation events
  await this.handleNotificationCreated(event, ctx);
} else {
  // Legacy event handling
  await this.handleGenericEvent(event, ctx);
}
```

## 🔧 Custom Event Handlers

### **Adding Custom Handlers**

```typescript
const config: RealtimeServiceConfig = {
  // ... other config
  eventHandlers: {
    'custom_event': async (event, ctx) => {
      // Custom processing logic
      console.log('Processing custom event:', event);
      
      // You can still use the standard notification flow
      await this.handleNotificationIntent(event, ctx);
    }
  }
};
```

### **Custom Routing Rules**

```typescript
const config: RealtimeServiceConfig = {
  // ... other config
  customRoutingRules: [
    {
      eventPattern: 'events.*.payment.*',
      channelTemplate: 'payments.{tenantId}',
      condition: (event) => event.payload.amount > 1000
    }
  ]
};
```

## 📊 Monitoring & Health

### **Health Endpoints**

- **Health Check**: `http://localhost:8080/health`
- **Metrics**: `http://localhost:9090/metrics`

### **Key Metrics**

```prometheus
# Service metrics
realtime_service_messages_total{status="processed"}
realtime_service_messages_total{status="failed"}
realtime_service_processing_duration_seconds

# Notification metrics
realtime_service_notifications_created_total
realtime_service_notifications_delivered_total{channel="realtime"}
realtime_service_notifications_delivered_total{channel="email"}
realtime_service_notifications_failed_total{channel="realtime"}

# Channel metrics
realtime_service_channels_active
realtime_service_users_online
```

## 🚀 Quick Start

### **Prerequisites**

```bash
# Start required services
docker-compose up -d postgres nats centrifugo

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/authless"
export NATS_URL="nats://127.0.0.1:4222"
export CENTRIFUGO_URL="http://localhost:8000"
export CENTRIFUGO_API_KEY="your-api-key"
```

### **Installation & Running**

```bash
# Install dependencies
pnpm install

# Build the service
cd services/realtime-service
pnpm run build

# Run in development
pnpm run start:dev

# Run in production
pnpm run start
```

### **Testing the System**

```typescript
// 1. Create a notification intent
const intent = await trpc.notification.createNotificationIntent.mutate({
  type: 'test_notification',
  recipients: ['user123'],
  payloadJson: { message: 'Hello World!' }
});

// 2. Check the notification was created
const notifications = await trpc.notification.getUserNotifications.query({
  limit: 10
});

// 3. Connect to Centrifugo for realtime updates
const { token, centrifugoUrl } = await trpc.notification.getCentrifugoToken.mutate();

// 4. Use the token to connect to Centrifugo WebSocket
const client = new CentrifugoClient(centrifugoUrl, token);
client.subscribe('user.user123.notifications', (message) => {
  console.log('Received notification:', message);
});
```

## 🔄 Event Examples

### **Support Case Notification**

```typescript
// Domain event from support system
await ctx.outbox.publishTenantEvent('SUPPORT_REPLY_CREATED', caseId, {
  caseId: 'CSC-123',
  message: 'Your support case has been updated',
  priority: 'high',
  userId: 'user123',
  tenantId: 'tenant-abc'
});

// Automatically mapped to notification via eventMappings
// Creates notification for case owner and support team
```

### **Payment Notification**

```typescript
// Payment completion event
await ctx.outbox.publishTenantEvent('PAYMENT_COMPLETED', paymentId, {
  paymentId: 'pay_123',
  amount: 99.99,
  currency: 'USD',
  userId: 'user123',
  tenantId: 'tenant-abc'
});

// Mapped to payment_success notification type
// Delivered via realtime and email channels
```

### **User Invitation**

```typescript
// Direct notification creation
await trpc.notification.createNotification.mutate({
  title: 'You\'ve been invited to join Acme Corp',
  description: 'Click the link below to accept your invitation',
  type: 'info',
  priority: 'normal',
  tenantId: 'tenant-abc',
  userId: 'user456'
});
```

## 🎨 Extensibility

### **Adding New Notification Types**

1. **Define the type** in your configuration:
```typescript
eventMappings: {
  'new_feature_released': {
    notificationType: 'feature_announcement',
    templateId: 'feature-announcement-template'
  }
}
```

2. **Create templates** (optional):
```typescript
// In your database
INSERT INTO "NotificationTemplate" (type, locale, subject, html) VALUES
('feature_announcement', 'en', 'New Feature: {featureName}', '<h1>{featureName}</h1><p>{description}</p>');
```

3. **Set user preferences**:
```typescript
await trpc.notification.updatePreferences.mutate({
  type: 'feature_announcement',
  channels: { web: true, email: false, mobile: false, desktop: false },
  categories: { 'product': true }
});
```

### **Adding New Delivery Channels**

1. **Extend the channel enum**:
```typescript
// In your schema
channel: 'realtime' | 'email' | 'sms' | 'whatsapp' | 'push' | 'slack'
```

2. **Add delivery logic**:
```typescript
private async processPushDelivery(notification: any, channel: string) {
  // Implement push notification delivery
  await this.pushService.send(notification);
}
```

3. **Update user preferences**:
```typescript
channels: {
  web: true,
  email: true,
  mobile: true,
  desktop: false,
  push: true,
  slack: false
}
```

## 🔒 Security

### **Authentication & Authorization**

- **JWT Tokens**: Centrifugo uses JWT tokens for authentication
- **Channel Permissions**: Users can only subscribe to authorized channels
- **Tenant Isolation**: Full tenant isolation for all operations
- **Role-based Access**: Support for role-based notification targeting

### **Data Privacy**

- **User Preferences**: Users control their notification preferences
- **Data Retention**: Configurable data retention policies
- **Audit Trail**: Complete audit trail for compliance
- **Encryption**: All sensitive data encrypted at rest and in transit

## 🐛 Troubleshooting

### **Common Issues**

1. **Notifications not delivered**:
   - Check NATS connection
   - Verify Centrifugo is running
   - Check user preferences
   - Review event mappings

2. **Database connection issues**:
   - Verify DATABASE_URL
   - Check PostgreSQL is running
   - Review connection pool settings

3. **Channel subscription failures**:
   - Check JWT token validity
   - Verify channel patterns
   - Review user permissions

### **Debug Mode**

```bash
# Enable debug logging
export DEBUG=realtime-service:*
pnpm run start:dev
```

### **Health Checks**

```bash
# Check service health
curl http://localhost:8080/health

# Check metrics
curl http://localhost:9090/metrics
```

## 📚 Related Documentation

- [Architecture Overview](../../ARCHITECTURE_README.md)
- [tRPC API Documentation](../../packages/trpc/README.md)
- [Database Schema](../../packages/db/README.md)
- [Centrifugo Integration](../../packages/shared/README.md)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2024-01-15