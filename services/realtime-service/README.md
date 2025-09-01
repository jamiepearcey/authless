# Realtime Service

A standalone service for processing realtime events and notifications using the JetStream Service Wrapper pattern.

## Status: Work in Progress

This service is currently under active development. The API, configuration options, and implementation details are subject to change as we iterate and improve the system.

## Purpose

The Realtime Service processes realtime events from NATS streams and handles realtime messaging, channel management, and notification delivery through Centrifugo.

## Architecture

This service follows the established pattern:
- **Domain Logic**: Lives in the service layer
- **Infrastructure**: Provided by `@jetstream/service-wrapper`
- **Event Processing**: Handles realtime events from NATS streams
- **Realtime Communication**: Manages Centrifugo channels and notifications
- **Database Integration**: PostgreSQL for persistence and state management

## Features

- **Event Processing**: Consumes realtime events from NATS streams
- **Channel Management**: Dynamic channel creation and management
- **Notification Routing**: Intelligent notification delivery to users
- **Realtime Messaging**: WebSocket-based realtime communication
- **Health Monitoring**: Built-in health checks and metrics
- **Graceful Shutdown**: Proper resource cleanup and shutdown handling
- **Retry Logic**: Configurable retry policies with DLQ support

## Quick Start

### **Prerequisites**
- NATS server running
- PostgreSQL database
- Centrifugo server running
- Node.js 18+ and pnpm

### **Installation**
```bash
# From root directory
pnpm install

# Build the service
cd services/realtime-service
pnpm run build
```

### **Configuration**
Set environment variables:
```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/db"
NATS_URL="nats://localhost:4222"
CENTRIFUGO_API_URL="http://localhost:8000"
CENTRIFUGO_API_KEY="your-api-key"

# Optional
SERVICE_NAME="realtime-service"
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
import { RealtimeServiceConfig } from '@jetstream/realtime-service';

const config: RealtimeServiceConfig = {
  serviceName: 'realtime-service',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'realtime_service',
  databaseUrl: 'postgresql://...',
  centrifugo: {
    apiUrl: 'http://localhost:8000',
    apiKey: 'your-api-key'
  },
  // ... other options
};
```

### **Custom Event Handlers**
```typescript
const config: RealtimeServiceConfig = {
  // ... other config
  customEventHandlers: {
    'user_joined': async (event, ctx) => {
      // Custom logic for user join events
      await this.channelRouter.routeEvent(event);
    },
    'message_sent': async (event, ctx) => {
      // Handle message events
      await this.handleRealtimeMessage(event);
    }
  }
};
```

## Database Integration

The service integrates with PostgreSQL for:
- **Channel State**: Persistent channel information
- **User Sessions**: User connection tracking
- **Event History**: Audit trail of realtime events
- **Notification State**: Delivery status and retry logic

## Realtime Communication

### **Centrifugo Integration**
- **Channel Management**: Dynamic channel creation and subscription
- **User Presence**: Track user online/offline status
- **Message Broadcasting**: Send messages to specific channels
- **API Integration**: RESTful API for server-side operations

### **Channel Types**
- **User Channels**: `user:{userId}` for user-specific messages
- **Tenant Channels**: `tenant:{tenantId}` for tenant-wide broadcasts
- **System Channels**: `system:*` for system-wide notifications
- **Custom Channels**: Dynamic channels based on business logic

## Monitoring & Health

### **Health Endpoints**
- **Health Check**: `http://localhost:8080/health`
- **Metrics**: `http://localhost:9090/metrics`

### **Key Metrics**
- `realtime_service_messages_total`: Total messages processed
- `realtime_service_processing_duration_seconds`: Processing latency
- `realtime_service_errors_total`: Error count
- `realtime_service_inflight_messages`: Current inflight count
- `realtime_service_channels_active`: Active channel count
- `realtime_service_users_online`: Online user count

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
- **Circuit Breakers**: Protection against downstream service failures

## Event Flow

1. **Event Source**: Application publishes realtime event to NATS stream
2. **Consumption**: Service consumes event from stream
3. **Processing**: Event processed through custom handlers (if configured)
4. **Routing**: Event routed to appropriate channels and users
5. **Delivery**: Message delivered via Centrifugo WebSocket connections
6. **Metrics**: Processing metrics and health status updated

## API Reference

### **RealtimeService Class**
```typescript
class RealtimeService {
  async start(): Promise<void>           // Start the service
  async stop(): Promise<void>            // Stop the service
  isRunning(): boolean                   // Check if running
  async getMetrics(): Promise<string>    // Get Prometheus metrics
  async broadcastToChannel(channel: string, message: any): Promise<void>
  async sendToUser(userId: string, message: any): Promise<void>
}
```

### **RealtimeServiceFactory**
```typescript
class RealtimeServiceFactory {
  static createService(config: RealtimeServiceConfig): RealtimeService
}
```

## Related Packages

- **`@jetstream/service-wrapper`**: Infrastructure and service management
- **`@jetstream/realtime-consumer`**: Realtime event processing logic
- **`@db/base`**: Database schema and client

## Examples

See `src/example-config.ts` for complete configuration examples including:
- Development configuration
- Production configuration
- Minimal test configuration
- Custom event handlers
- Centrifugo integration setup

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

### **Environment Variables**
```bash
# Production example
DATABASE_URL="postgresql://user:password@db:5432/production"
NATS_URL="nats://nats:4222"
CENTRIFUGO_API_URL="http://centrifugo:8000"
CENTRIFUGO_API_KEY="production-api-key"
SERVICE_NAME="realtime-service"
APP_VERSION="1.0.0"
```

## Contributing

1. Follow the established service pattern
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling and logging
5. Follow TypeScript best practices
6. Test Centrifugo integration thoroughly

---

For more information, see the main [Architecture README](../../ARCHITECTURE_README.md).
