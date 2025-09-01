# Webhook Service

A JetStream-powered webhook delivery service that consumes events and delivers them to configured webhook endpoints with retry logic, concurrency control, and delivery tracking.

## Architecture

This service follows the Beat The Fine London architecture pattern:

- **Domain Logic**: Lives in `@jetstream/webhook-consumer` package
- **Service Entry Point**: Lives in `services/webhook-service/`
- **Infrastructure**: Provided by `@jetstream/service-wrapper`

## Features

- ✅ Consumes events from NATS JetStream
- ✅ Configurable webhook endpoints with event filtering
- ✅ Automatic retry logic with exponential backoff
- ✅ HMAC signature verification for security
- ✅ Delivery tracking and logging
- ✅ Health checks and metrics
- ✅ Graceful shutdown

## Environment Variables

```bash
# NATS Configuration
NATS_URL=nats://localhost:4222
NATS_STREAM_NAME=EVENTS
WEBHOOK_CONSUMER_NAME=webhook-consumer
WEBHOOK_FILTER_SUBJECTS=events.webhook.*

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beatthefine

# Processing Configuration
WEBHOOK_CONCURRENCY=5
WEBHOOK_BATCH_SIZE=1
WEBHOOK_ACK_WAIT_MS=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_BACKOFF_MS=1000

# Service Configuration
PORT=8080
METRICS_PORT=9090
```

## Running the Service

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start
```

## Health Check

The service exposes health checks at `:8080/live` and `:8080/ready` via Lightship.

## Metrics

Prometheus metrics are available at `:9090/metrics`.

## Database Schema

The service expects the following tables:

```sql
-- Webhook endpoints configuration
CREATE TABLE "WebhookEndpoint" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL,
  "tenantId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  timeout INTEGER NOT NULL DEFAULT 30000,
  headers JSONB
);

-- Webhook delivery logging
CREATE TABLE "WebhookDelivery" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhookId" TEXT NOT NULL REFERENCES "WebhookEndpoint"(id),
  "eventId" TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  "statusCode" INTEGER,
  "responseTime" INTEGER NOT NULL,
  error TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```