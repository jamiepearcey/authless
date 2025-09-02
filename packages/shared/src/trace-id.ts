import { randomBytes } from 'crypto';

/**
 * Generate a unique trace ID for distributed tracing
 * Uses a combination of timestamp and random bytes for uniqueness
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Extract trace ID from headers or context
 */
export function extractTraceId(headers: Record<string, string | string[] | undefined>): string | undefined {
  // Check various common trace ID header names
  const traceHeaders = [
    'x-trace-id',
    'x-request-id',
    'x-correlation-id',
    'traceparent', // OpenTelemetry standard
    'b3', // Zipkin standard
  ];

  for (const header of traceHeaders) {
    const value = headers[header];
    if (value) {
      // Handle both string and array values
      const traceId = Array.isArray(value) ? value[0] : value;
      if (traceId && typeof traceId === 'string' && traceId.trim()) {
        return traceId.trim();
      }
    }
  }

  return undefined;
}

/**
 * Create trace context for propagation
 */
export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
}

/**
 * Generate a new span ID
 */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Create trace context from existing trace ID or generate new one
 */
export function createTraceContext(
  existingTraceId?: string,
  parentSpanId?: string
): TraceContext {
  return {
    traceId: existingTraceId || generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId,
  };
}

/**
 * Format trace ID for logging
 */
export function formatTraceId(traceId: string): string {
  return `[trace:${traceId}]`;
}

/**
 * Add trace ID to headers for HTTP requests
 */
export function addTraceHeaders(headers: Record<string, string>, traceId: string): Record<string, string> {
  return {
    ...headers,
    'x-trace-id': traceId,
    'x-request-id': traceId, // Common alternative
  };
}
