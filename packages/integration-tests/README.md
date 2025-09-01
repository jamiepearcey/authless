# Integration Tests

Comprehensive integration tests for the outbox processor and event-driven architecture with JetStream.

## Overview

These tests verify the complete event flow:
1. **Outbox Events** → **PostgreSQL Outbox Table**
2. **Outbox Processor** → **NATS JetStream**
3. **JetStream** → **Consumers** (Email, Webhook, Realtime)

## Prerequisites

### 1. Start Infrastructure

```bash
# Start PostgreSQL and NATS JetStream
docker-compose up -d postgres nats
```

### 2. Setup Test Database

```bash
# Create test database (if not exists)
createdb beatthefine_test

# Or connect and create manually
psql postgresql://postgres:postgres@localhost:5432/postgres
CREATE DATABASE beatthefine_test;
\q
```

### 3. Run Database Migrations

```bash
cd ../db
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine_test" npx prisma db push
```

## Running Tests

### All Integration Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Outbox processor tests only
npm test outbox-processor

# Email consumer tests only  
npm test email-consumer

# End-to-end tests only
npm test end-to-end
```

### Watch Mode
```bash
npm run test:watch
```

### With Debug Output
```bash
DEBUG=* npm test
```

## Test Architecture

### Test Environment Setup
- **PostgreSQL**: Dedicated test database with clean slate for each test
- **NATS JetStream**: In-memory streams for fast test execution
- **Mock Providers**: Email, HTTP, and Centrifugo clients are mocked

### Test Categories

#### 1. Outbox Processor Tests (`outbox-processor.test.ts`)
- ✅ Event processing and JetStream publishing
- ✅ Batch processing with FOR UPDATE SKIP LOCKED
- ✅ Retry logic with exponential backoff
- ✅ Idempotency key handling
- ✅ Statistics and monitoring

#### 2. Email Consumer Tests (`email-consumer.test.ts`)
- ✅ Event filtering by subject patterns
- ✅ Template rendering with Handlebars
- ✅ Multiple recipient handling
- ✅ Error handling and recovery
- ✅ Rate limiting compliance

#### 3. End-to-End Tests (`end-to-end.test.ts`)
- ✅ Complete workflow: Database → JetStream → All Consumers
- ✅ Multiple event types and routing
- ✅ High throughput and ordering
- ✅ Consumer failure isolation
- ✅ Cross-consumer data integrity

## Test Data Flow

```mermaid
graph LR
    A[Test Creates Event] --> B[OutboxEvent Table]
    B --> C[PostgreSQL Trigger]
    C --> D[Outbox Processor]
    D --> E[NATS JetStream]
    E --> F[Email Consumer]
    E --> G[Webhook Consumer]
    E --> H[Realtime Consumer]
    F --> I[Mock Email Provider]
    G --> J[Mock HTTP Client]
    H --> K[Mock Centrifugo]
```

## Mock Implementations

### Email Provider
```typescript
const mockEmailProvider = {
  async sendEmail(options: any) {
    mockEmailSent.push(options);
    return { success: true, messageId: `mock-${Date.now()}` };
  }
};
```

### HTTP Client (Webhooks)
```typescript
const mockHttpClient = {
  async post(url: string, data: any, options?: any) {
    mockWebhooksDelivered.push({ url, data, options });
    return { status: 200, data: { received: true } };
  }
};
```

### Centrifugo (Realtime)
```typescript
const mockCentrifugo = {
  async publish(channel: string, data: any) {
    mockRealtimeMessages.push({ channel, data });
    return { success: true };
  }
};
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL test database connection | `postgresql://postgres:postgres@localhost:5432/beatthefine_test` |
| `NATS_URL` | NATS server URL | `nats://localhost:4222` |
| `DEBUG` | Enable debug logging | - |

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Test connection manually
psql postgresql://postgres:postgres@localhost:5432/beatthefine_test -c "SELECT 1"
```

### NATS Connection Issues
```bash
# Check if NATS is running
docker-compose ps nats

# Test NATS connection
docker-compose exec nats nats server check connection
```

### Test Timeouts
- Integration tests have a 30-second timeout
- High throughput tests may need adjustment for slower systems
- Use `npm run test:watch` for development

### Clean Test State
```bash
# Reset test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine_test" npx prisma db push --force-reset

# Clear NATS streams
docker-compose restart nats
```

## Adding New Tests

### 1. Create Test File
```typescript
// packages/integration-tests/src/new-feature.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestEnvironment } from './test-utils';

describe('New Feature Tests', () => {
  // Test implementation
});
```

### 2. Add Test Utilities
```typescript
// Add to test-utils.ts
export function createNewFeatureEvent() {
  return {
    eventType: 'feature.created',
    // ...
  };
}
```

### 3. Update Package Dependencies
```json
{
  "dependencies": {
    "@new/package": "workspace:*"
  }
}
```

## Performance Benchmarks

The integration tests also serve as performance benchmarks:

- **Outbox Processing**: ~100 events/second with PostgreSQL
- **JetStream Throughput**: ~1000+ events/second in-memory
- **Consumer Processing**: ~50-200 events/second (depends on external calls)
- **End-to-End Latency**: ~50-200ms for simple events

## CI/CD Integration

For continuous integration, ensure:

1. **Database Setup**: Use testcontainers or dedicated test DB
2. **NATS Setup**: Use embedded NATS server for CI
3. **Parallel Execution**: Disable for integration tests
4. **Cleanup**: Ensure proper cleanup after test failures

```yaml
# GitHub Actions example
- name: Setup Test Infrastructure
  run: docker-compose up -d postgres nats
  
- name: Run Integration Tests  
  run: npm run test:e2e
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/beatthefine_test
    NATS_URL: nats://localhost:4222
```