# JetStream Service Wrapper

A comprehensive wrapper for building NATS JetStream services with built-in health checks, metrics, and structured logging using Pino.

## Features

- **NATS JetStream Integration**: Easy setup and management of JetStream consumers
- **Health Monitoring**: Built-in health checks with Lightship integration
- **Metrics Collection**: Prometheus metrics and custom metric collection
- **Structured Logging**: High-performance Pino-based logging with pretty printing in development
- **Graceful Shutdown**: Proper cleanup and shutdown handling
- **Configuration Management**: Zod-based configuration validation
- **Error Handling**: Comprehensive error handling and retry logic

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @jetstream/service-wrapper
```

### 2. Create a Service

```typescript
import { JetStreamServiceWrapper, createLogger } from '@jetstream/service-wrapper';
import type { JetStreamService, ProcessingContext } from '@jetstream/service-wrapper';

class MyService implements JetStreamService {
  serviceName = 'my-service';
  version = '1.0.0';
  
  private logger = createLogger('my-service');

  async processMessage(context: ProcessingContext, data: any): Promise<void> {
    this.logger.info('Processing message', { 
      messageId: context.messageId,
      subject: context.subject,
      sequence: context.sequence 
    });

    // Your message processing logic here
    const result = await this.processData(data);
    
    this.logger.info('Message processed successfully', { 
      messageId: context.messageId,
      result 
    });
  }

  private async processData(data: any): Promise<any> {
    // Your business logic here
    return { processed: true, timestamp: new Date() };
  }
}
```

### 3. Run the Service

```typescript
import { runService } from '@jetstream/service-wrapper';
import { MyService } from './my-service';

const service = new MyService();

// Run with default configuration
await runService(service);

// Or with custom configuration
await runService(service, {
  natsUrl: 'nats://127.0.0.1:4223',
  streamName: 'events',
  consumerName: 'my-service-consumer',
  concurrency: 5,
  batchSize: 10,
});
```

## Logging with Pino

The service wrapper uses Pino for high-performance structured logging.

### Basic Logger Creation

```typescript
import { createLogger } from '@jetstream/service-wrapper';

const logger = createLogger('my-service');
```

### Logger Configuration

```typescript
const logger = createLogger('my-service', {
  level: 'debug',
  base: {
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    instance: process.env.INSTANCE_ID || 'local',
  },
});
```

### Child Loggers

Create child loggers with additional context:

```typescript
import { createChildLogger } from '@jetstream/service-wrapper';

const dbLogger = createChildLogger(logger, { component: 'database' });
const apiLogger = createChildLogger(logger, { component: 'api' });

dbLogger.info('Database connection established', { host: 'localhost', port: 5432 });
apiLogger.warn('Rate limit approaching', { current: 95, limit: 100 });
```

### Logging Levels

```typescript
logger.debug('Debug information', { config: { port: 3000 } });
logger.info('Service started successfully');
logger.warn('Resource usage is high', { memory: '850MB', cpu: 'high' });
logger.error('Failed to process request', error, { requestId: '12345' });
```

### Error Logging

Pino automatically serializes Error objects:

```typescript
try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.error('Failed to process request', error, { 
    requestId: '12345',
    userId: 'user-123' 
  });
}
```

### Graceful Shutdown

```typescript
import { flushLogger } from '@jetstream/service-wrapper';

async function gracefulShutdown() {
  logger.info('Starting graceful shutdown...');
  
  try {
    // Flush any pending logs
    await flushLogger(logger);
    logger.info('Logger flushed successfully');
    
    // Perform other cleanup
    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
  }
}
```

## Environment Configuration

### Development Mode

In development, logs are automatically pretty-printed with colors:

```bash
NODE_ENV=development pnpm start
```

### Production Mode

In production, logs are output as JSON for easy parsing:

```bash
NODE_ENV=production pnpm start
```

### Custom Log Level

```bash
LOG_LEVEL=debug pnpm start
```

### Disable Pretty Logging

```bash
DISABLE_PRETTY_LOGGING=true pnpm start
```

## Configuration Options

```typescript
import { ServiceConfigSchema } from '@jetstream/service-wrapper';

const config = ServiceConfigSchema.parse({
  serviceName: 'my-service',
  version: '1.0.0',
  natsUrl: 'nats://127.0.0.1:4223',
  streamName: 'events',
  consumerName: 'my-service-consumer',
  concurrency: 10,
  batchSize: 50,
  retryLimit: 3,
  retryBackoffMs: 1000,
  ackWaitMs: 30000,
  healthCheckIntervalMs: 30000,
  metricsEnabled: true,
  lightshipPort: 9000,
  lightshipGracefulShutdownTimeout: 120000,
  logLevel: 'info',
  structuredLogging: true,
});
```

## Health Checks

The service wrapper automatically provides health endpoints:

- **Health Check**: `GET /health`
- **Readiness**: `GET /ready`
- **Liveness**: `GET /live`

## Metrics

Built-in Prometheus metrics:

- Message processing counts
- Processing duration
- Error rates
- System metrics (memory, CPU)

## Examples

See `src/examples/logger-usage.ts` for comprehensive logging examples.

## Dependencies

- **NATS**: JetStream messaging
- **Pino**: High-performance logging
- **Lightship**: Health monitoring
- **Prometheus**: Metrics collection
- **Zod**: Configuration validation

## Performance

Pino is one of the fastest Node.js loggers available:

- **JSON output**: Significantly faster than console.log
- **Pretty output**: High-performance pretty printing
- **Minimal overhead**: Sub-millisecond logging operations
- **Async by default**: Non-blocking log operations

## Best Practices

1. **Use Child Loggers**: Create component-specific loggers for better context
2. **Structured Data**: Always pass metadata as objects, not strings
3. **Error Handling**: Pass Error objects directly to logger.error()
4. **Graceful Shutdown**: Always flush logs before shutting down
5. **Environment Awareness**: Use different log levels for different environments
6. **Performance**: Avoid expensive operations in log statements
