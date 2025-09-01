# Audit Service

A standalone service for processing and storing audit events using the JetStream Service Wrapper pattern.

## Status: Work in Progress

This service is currently under active development. The API, configuration options, and implementation details are subject to change as we iterate and improve the system.

## Purpose

The Audit Service processes audit events from NATS streams and stores them in a PostgreSQL database for compliance, monitoring, and analysis purposes.

## Architecture

This service follows the established pattern:
- **Domain Logic**: Lives in the service layer
- **Infrastructure**: Provided by `@jetstream/service-wrapper`
- **Event Processing**: Handles audit events from NATS streams
- **Storage**: PostgreSQL database with structured audit schema

## Features

- **Event Processing**: Consumes audit events from NATS streams
- **Database Storage**: Stores events in structured PostgreSQL tables
- **Custom Handlers**: Configurable event-specific processing logic
- **Health Monitoring**: Built-in health checks and metrics
- **Graceful Shutdown**: Proper resource cleanup and shutdown handling
- **Retry Logic**: Configurable retry policies with DLQ support

## Quick Start

### **Prerequisites**
- NATS server running
- PostgreSQL database with audit schema
- Node.js 18+ and pnpm

### **Installation**
```bash
# From root directory
pnpm install

# Build the service
cd services/audit-service
pnpm run build
```

### **Configuration**
Set environment variables:
```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/db"
NATS_URL="nats://localhost:4222"

# Optional
SERVICE_NAME="audit-service"
APP_VERSION="1.0.0"
PORT=8080
METRICS_PORT=9090
```

### **Running**
```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run start
```

## Configuration

### **Service Configuration**
```typescript
import { AuditServiceConfig } from '@jetstream/audit-service';

const config: AuditServiceConfig = {
  serviceName: 'audit-service',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'audit_service',
  databaseUrl: 'postgresql://...',
  // ... other options
};
```

### **Custom Event Handlers**
```typescript
const config: AuditServiceConfig = {
  // ... other config
  customAuditHandlers: {
    'payment_completed': async (event, ctx) => {
      // Custom logic for payment events
      console.log('Payment completed:', event.id);
    },
    'security_breach': async (event, ctx) => {
      // Trigger security alerts
      await sendSecurityAlert(event);
    }
  }
};
```

## Database Schema

The service stores audit events in the `AuditEvent` table with the following structure:

- **Event Information**: `id`, `eventType`, `eventName`, `timestamp`
- **Context**: `tenantId`, `userId`, `aggregateType`, `aggregateId`
- **Source**: `sourceService`, `sourceVersion`, `sourceHost`
- **Actor**: `actorType`, `actorId`, `actorName`, `actorEmail`
- **Resource**: `resourceType`, `resourceId`, `resourceName`
- **Action**: `actionType`, `actionDescription`, `actionOutcome`, `actionReason`
- **Data**: `metadata`, `originalPayload`

## Monitoring & Health

### **Health Endpoints**
- **Health Check**: `http://localhost:8080/health`
- **Metrics**: `http://localhost:9090/metrics`

### **Key Metrics**
- `audit_service_messages_total`: Total messages processed
- `audit_service_processing_duration_seconds`: Processing latency
- `audit_service_errors_total`: Error count
- `audit_service_inflight_messages`: Current inflight count

## Development

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

## Error Handling

The service includes comprehensive error handling:
- **Retry Logic**: Configurable retry policies with exponential backoff
- **Dead Letter Queue**: Failed messages sent to DLQ after max retries
- **Structured Logging**: Detailed error context and stack traces
- **Health Checks**: Service health monitoring and degradation detection

## Event Flow

1. **Event Source**: Application publishes audit event to NATS stream
2. **Consumption**: Service consumes event from stream
3. **Processing**: Event processed through custom handlers (if configured)
4. **Storage**: Event stored in PostgreSQL database
5. **Metrics**: Processing metrics and health status updated

## API Reference

### **AuditService Class**
```typescript
class AuditService {
  async start(): Promise<void>           // Start the service
  async stop(): Promise<void>            // Stop the service
  isRunning(): boolean                   // Check if running
  async getMetrics(): Promise<string>    // Get Prometheus metrics
}
```

### **AuditServiceFactory**
```typescript
class AuditServiceFactory {
  static createService(config: AuditServiceConfig): AuditService
}
```

## Related Packages

- **`@jetstream/service-wrapper`**: Infrastructure and service management
- **`@jetstream/audit-consumer`**: Audit event processing logic
- **`@db/base`**: Database schema and client

## Examples

See `src/example-config.ts` for complete configuration examples including:
- Development configuration
- Production configuration
- Minimal test configuration
- Custom event handlers

## Deployment

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

## Contributing

1. Follow the established service pattern
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling and logging
5. Follow TypeScript best practices

---

For more information, see the main [Architecture README](../../ARCHITECTURE_README.md).
