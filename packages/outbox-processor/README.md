# Outbox Processor

A high-performance outbox pattern processor that provides reliable event publishing to NATS JetStream with minimal latency.

## Features

- **Low Latency**: Uses PostgreSQL LISTEN/NOTIFY for instant wake-up on new events
- **Batch Processing**: Efficiently processes events in configurable batches
- **Retry Logic**: Exponential backoff with jitter for failed events
- **Dead Letter Queue**: Events that exceed max retries are marked as dead
- **Graceful Shutdown**: Handles SIGINT/SIGTERM for clean shutdown
- **FOR UPDATE SKIP LOCKED**: Prevents lock contention in multi-instance deployments
- **Health Monitoring**: Built-in statistics and monitoring capabilities

## Quick Start

### 1. Setup Database Triggers

```bash
npm run setup-db
```

Or manually run the setup:

```typescript
import { setupOutboxDatabase } from '@outbox/processor';

await setupOutboxDatabase(process.env.DATABASE_URL);
```

### 2. Start the Processor

```bash
npm start
```

Or programmatically:

```typescript
import { OutboxProcessor } from '@outbox/processor';

const processor = new OutboxProcessor({
  databaseUrl: process.env.DATABASE_URL!,
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  batchSize: 100,
  maxTries: 10,
  idleSleepMs: 500
});

await processor.init();
await processor.start();
```

## Configuration

Environment variables:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NATS_URL` - NATS server URL (default: nats://localhost:4222)
- `BATCH_SIZE` - Events processed per batch (default: 100)
- `MAX_TRIES` - Maximum retry attempts (default: 10)
- `IDLE_SLEEP_MS` - Fallback sleep when no notifications (default: 500ms)

## Architecture

### Processing Flow

1. **Event Creation**: When events are inserted into `outbox_events`, a trigger sends a notification
2. **Instant Wake-up**: The processor receives the notification and immediately starts processing
3. **Batch Claiming**: Uses `FOR UPDATE SKIP LOCKED` to claim a batch of pending events
4. **JetStream Publishing**: Publishes each event to NATS JetStream with deduplication
5. **Status Updates**: Marks events as sent, or schedules retries with exponential backoff

### Database Schema

The processor expects an `outbox_events` table with the following structure:

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  aggregate_id VARCHAR NOT NULL,
  tenant_id VARCHAR NOT NULL,
  payload_json JSONB NOT NULL,
  idempotency_key VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending',
  tries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT
);
```

### Event Statuses

- `pending` - Ready to be processed
- `processing` - Currently being processed
- `sent` - Successfully published to JetStream
- `failed` - Failed processing, will be retried
- `dead` - Exceeded max retries, requires manual intervention

## Monitoring

### Get Statistics

```typescript
const stats = await processor.getStats();
console.log(stats);
```

### Health Checks

The processor provides built-in health monitoring through status tracking and can be integrated with your monitoring stack.

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

CMD ["npm", "start"]
```

### Multiple Instances

The processor is designed to work with multiple instances:
- Uses `FOR UPDATE SKIP LOCKED` to prevent event duplication
- Each instance will claim different batches of events
- Scale horizontally by running more instances

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: outbox-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: outbox-processor
  template:
    metadata:
      labels:
        app: outbox-processor
    spec:
      containers:
      - name: outbox-processor
        image: your-registry/outbox-processor:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: NATS_URL
          value: "nats://nats-service:4222"
```

## Troubleshooting

### High Retry Rates

- Check NATS JetStream connectivity
- Verify stream configurations match event subjects
- Monitor resource usage (CPU/Memory)

### Events Stuck in Processing

- The processor automatically resets stuck events after 30 minutes
- Check for application crashes during processing

### Performance Tuning

- Increase `BATCH_SIZE` for higher throughput
- Adjust `IDLE_SLEEP_MS` based on event frequency
- Monitor PostgreSQL connection pool settings