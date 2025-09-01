# Email Service

A standalone service for processing and sending templated emails using the JetStream Service Wrapper pattern.

## 🎯 **Purpose**

The Email Service processes email events from NATS streams and sends templated emails to recipients using React Email templates and various email providers (Mailgun, SendGrid, SMTP).

## 🏗️ **Architecture**

This service follows the established pattern:
- **Domain Logic**: Lives in the service layer
- **Infrastructure**: Provided by `@jetstream/service-wrapper`
- **Event Processing**: Handles email events from NATS streams
- **Template Rendering**: Uses React Email for beautiful, responsive email templates
- **Provider Integration**: Supports multiple email delivery providers

## 📋 **Features**

- **Event-Driven Processing**: Consumes email events from NATS streams
- **React Email Templates**: Modern, responsive email templates using React
- **Multiple Providers**: Mailgun, SendGrid, and SMTP support
- **Smart Routing**: Configurable routing rules for different event types
- **Template Variables**: Dynamic content injection from event data
- **Health Monitoring**: Built-in health checks and metrics
- **Graceful Shutdown**: Proper resource cleanup and shutdown handling
- **Retry Logic**: Configurable retry policies with DLQ support

## 🚀 **Quick Start**

### **Prerequisites**
- NATS server running
- PostgreSQL database
- Email provider credentials (Mailgun, SendGrid, or SMTP)
- Node.js 18+ and pnpm

### **Installation**
```bash
# From root directory
pnpm install

# Build the service
cd services/email-service
pnpm run build
```

### **Configuration**
Set environment variables:
```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/db"
NATS_URL="nats://localhost:4222"

# Email Provider (choose one)
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-domain.com"

# Or SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"

# Or SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Optional
SERVICE_NAME="email-service"
APP_VERSION="1.0.0"
PORT=8080
METRICS_PORT=9090
FROM_EMAIL="noreply@example.com"
FROM_NAME="Example System"
```

### **Running**
```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run start
```

## ⚙️ **Configuration**

### **Service Configuration**
```typescript
import { EmailServiceConfig } from '@jetstream/email-service';

const config: EmailServiceConfig = {
  serviceName: 'email-service',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'email_service',
  databaseUrl: 'postgresql://...',
  emailProvider: {
    type: 'mailgun',
    apiKey: 'your-api-key',
    domain: 'your-domain.com',
  },
  routingRules: [
    {
      eventPattern: 'user.registered',
      templateName: 'welcome-email',
      priority: 'high',
      extractVariables: (event) => ({
        userName: event.payload.userName,
        userEmail: event.payload.userEmail,
      }),
    },
  ],
  templates: new Map([
    ['welcome-email', {
      name: 'welcome-email',
      component: WelcomeEmail,
      subject: 'Welcome {{userName}}!',
      variables: ['userName', 'userEmail'],
    }],
  ]),
  filterSubjects: ['events.*.user.registered'],
  defaultFrom: {
    email: 'noreply@example.com',
    name: 'Example System',
  },
};
```

### **Email Templates**
Templates are React components that render to HTML and plain text:

```tsx
import React from 'react';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ userName, userEmail }) => {
  return (
    <div>
      <h1>Welcome {userName}!</h1>
      <p>Your account has been created with {userEmail}</p>
    </div>
  );
};
```

### **Routing Rules**
Define how events map to templates:

```typescript
{
  eventPattern: 'payment.completed',
  templateName: 'payment-receipt',
  priority: 'normal',
  extractVariables: (event) => ({
    userName: event.payload.userName,
    amount: event.payload.amount,
    currency: event.payload.currency,
    transactionId: event.payload.transactionId,
  }),
  condition: (event) => event.payload.amount > 0, // Optional condition
  tenantId: 'specific-tenant', // Optional tenant-specific routing
}
```

## 🗄️ **Database Integration**

The service integrates with PostgreSQL for:
- **User Lookup**: Finding recipients based on event type and tenant
- **Delivery Logging**: Tracking email delivery status and results
- **User Preferences**: Respecting email notification preferences

### **Required Tables**
```sql
-- Users table (already exists in your schema)
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  "emailNotifications" BOOLEAN DEFAULT true
);

-- Memberships table (for tenant-specific routing)
CREATE TABLE "Membership" (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "User"(id),
  "tenantId" TEXT REFERENCES "Tenant"(id)
);
```

## 📡 **Email Providers**

### **Mailgun**
```typescript
emailProvider: {
  type: 'mailgun',
  apiKey: 'your-api-key',
  domain: 'your-domain.com',
}
```

### **SendGrid**
```typescript
emailProvider: {
  type: 'sendgrid',
  apiKey: 'your-api-key',
}
```

### **SMTP**
```typescript
emailProvider: {
  type: 'smtp',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
}
```

## 📊 **Monitoring & Health**

### **Health Endpoints**
- **Health Check**: `http://localhost:8080/health`
- **Metrics**: `http://localhost:9090/metrics`

### **Key Metrics**
- `email_service_messages_total`: Total email events processed
- `email_service_processing_duration_seconds`: Processing latency
- `email_service_errors_total`: Error count
- `email_service_inflight_messages`: Current inflight count
- `email_service_emails_sent_total`: Total emails sent
- `email_service_emails_failed_total`: Total failed emails

## 🔧 **Development**

### **Building**
```bash
pnpm run build
```

### **Development Mode**
```bash
pnpm run dev
```

### **Testing**
```bash
pnpm run test
```

### **Clean Build**
```bash
pnpm run clean && pnpm run build
```

## 🚨 **Error Handling**

The service includes comprehensive error handling:
- **Retry Logic**: Configurable retry policies with exponential backoff
- **Dead Letter Queue**: Failed events sent to DLQ after max retries
- **Structured Logging**: Detailed error context and stack traces
- **Health Checks**: Service health monitoring and degradation detection
- **Provider Fallbacks**: Automatic fallback between email providers

## 🔄 **Event Flow**

1. **Email Event**: Application publishes email event to NATS stream
2. **Consumption**: Service consumes event from stream
3. **Routing**: Event routed to appropriate template based on rules
4. **Recipient Lookup**: Database queried for eligible recipients
5. **Template Rendering**: React Email template rendered with variables
6. **Email Delivery**: Email sent via configured provider
7. **Logging**: Delivery result logged to database
8. **Metrics**: Processing metrics and health status updated

## 📚 **API Reference**

### **EmailService Class**
```typescript
class EmailService {
  async start(): Promise<void>           // Start the service
  async stop(): Promise<void>            // Stop the service
  isRunning(): boolean                   // Check if running
  async getMetrics(): Promise<string>    // Get Prometheus metrics
}
```

### **EmailServiceFactory**
```typescript
class EmailServiceFactory {
  static createService(config: EmailServiceConfig): EmailService
}
```

## 🔗 **Related Packages**

- **`@jetstream/service-wrapper`**: Infrastructure and service management
- **`@jetstream/email-consumer`**: Email event processing logic
- **`@db/base`**: Database schema and client

## 📝 **Examples**

See `src/example-config.ts` for complete configuration examples including:
- Development configuration
- Production configuration
- Minimal test configuration
- Email provider setup
- Template configuration

## 🚀 **Deployment**

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/start.js"]
```

### **Kubernetes**
The service includes Lightship health checks for Kubernetes readiness/liveness probes.

### **Environment Variables**
```bash
# Production example
DATABASE_URL="postgresql://user:password@db:5432/production"
NATS_URL="nats://nats:4222"
MAILGUN_API_KEY="production-api-key"
MAILGUN_DOMAIN="production-domain.com"
SERVICE_NAME="email-service"
APP_VERSION="1.0.0"
```

## 🤝 **Contributing**

1. Follow the established service pattern
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling and logging
5. Follow TypeScript best practices
6. Test email provider integration thoroughly

---

For more information, see the main [Architecture README](../../README.md).
