import { EventNormalizer, AuditEvent } from '../types';
import { z } from 'zod';
import crypto from 'crypto';

// Base Event Schema - matches JetStream event structure
const BaseJetStreamEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  tenantId: z.string(),
  payload: z.record(z.any()),
  created: z.string().or(z.date()),
  idempotencyKey: z.string().optional(),
});

export abstract class BaseEventNormalizer implements EventNormalizer {
  abstract canHandle(eventType: string): boolean;
  
  abstract normalize(rawEvent: any): Promise<AuditEvent>;

  protected parseBaseEvent(rawEvent: any) {
    return BaseJetStreamEventSchema.parse(rawEvent);
  }

  protected generateAuditId(eventId: string, tenantId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${eventId}-${tenantId}-audit`)
      .digest('hex')
      .substring(0, 32);
  }

  protected parseTimestamp(timestamp: string | Date): Date {
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }

  protected extractMetadata(payload: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Common metadata extraction
    if (payload.metadata) {
      Object.assign(metadata, payload.metadata);
    }
    
    if (payload.requestId) metadata.requestId = payload.requestId;
    if (payload.correlationId) metadata.correlationId = payload.correlationId;
    if (payload.sessionId) metadata.sessionId = payload.sessionId;
    if (payload.ipAddress) metadata.ipAddress = payload.ipAddress;
    if (payload.userAgent) metadata.userAgent = payload.userAgent;
    
    return metadata;
  }

  protected inferActor(payload: any) {
    // Try to extract actor information from common payload patterns
    if (payload.userId || payload.user) {
      return {
        type: 'user' as const,
        id: payload.userId || payload.user?.id || 'unknown',
        name: payload.user?.name,
        email: payload.user?.email,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      };
    }

    if (payload.serviceId || payload.service) {
      return {
        type: 'service' as const,
        id: payload.serviceId || payload.service?.id || 'unknown',
        name: payload.service?.name,
      };
    }

    return {
      type: 'system' as const,
      id: 'system',
      name: 'System',
    };
  }

  protected inferResource(aggregateType: string, aggregateId: string, payload: any) {
    return {
      type: aggregateType,
      id: aggregateId,
      name: payload.name || payload.title || undefined,
      attributes: payload.resourceAttributes || undefined,
    };
  }

  protected inferAction(eventType: string, payload: any) {
    const parts = eventType.split('.');
    const actionType = parts[parts.length - 1]; // e.g., 'created', 'updated', 'deleted'
    
    return {
      type: actionType,
      description: payload.actionDescription || `${actionType} ${parts[0]}`,
      outcome: payload.success === false ? 'failure' as const : 
               payload.error ? 'failure' as const : 'success' as const,
      reason: payload.error || payload.reason || undefined,
    };
  }

  protected createSource(eventType: string, payload: any) {
    return {
      service: payload.source?.service || 'authless',
      version: payload.source?.version || process.env.APP_VERSION || '1.0.0',
      host: payload.source?.host || process.env.HOSTNAME || 'unknown',
      requestId: payload.requestId || payload.source?.requestId,
      correlationId: payload.correlationId || payload.source?.correlationId,
    };
  }
}