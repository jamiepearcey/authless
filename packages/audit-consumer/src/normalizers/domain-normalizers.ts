import { BaseEventNormalizer } from './base-normalizer';
import { AuditEvent } from '../types';

// User Authentication Events Normalizer
export class AuthEventNormalizer extends BaseEventNormalizer {
  canHandle(eventType: string): boolean {
    return eventType.includes('user_logged_in') || 
           eventType.includes('user_logged_out') || 
           eventType.includes('user_registered') ||
           eventType.includes('user_updated');
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const baseEvent = this.parseBaseEvent(rawEvent);
    
    return {
      id: this.generateAuditId(baseEvent.id, baseEvent.tenantId),
      eventType: 'auth',
      eventName: baseEvent.eventType,
      tenantId: baseEvent.tenantId,
      userId: baseEvent.payload.userId,
      aggregateType: baseEvent.aggregateType,
      aggregateId: baseEvent.aggregateId,
      timestamp: this.parseTimestamp(baseEvent.created),
      source: this.createSource(baseEvent.eventType, baseEvent.payload),
      actor: this.inferActor(baseEvent.payload),
      resource: {
        type: 'user',
        id: baseEvent.payload.userId || baseEvent.aggregateId,
        name: baseEvent.payload.name || baseEvent.payload.email,
        attributes: {
          email: baseEvent.payload.email,
          role: baseEvent.payload.role,
        },
      },
      action: {
        type: baseEvent.eventType.includes('logged_in') ? 'login' : 
              baseEvent.eventType.includes('logged_out') ? 'logout' :
              baseEvent.eventType.includes('registered') ? 'register' : 'update',
        description: baseEvent.eventType.includes('logged_in') ? 'User logged in' :
                    baseEvent.eventType.includes('logged_out') ? 'User logged out' :
                    baseEvent.eventType.includes('registered') ? 'User registered' : 'User updated',
        outcome: baseEvent.payload.success === false ? 'failure' : 'success',
        reason: baseEvent.payload.error || baseEvent.payload.reason,
      },
      metadata: {
        ...this.extractMetadata(baseEvent.payload),
        authMethod: baseEvent.payload.authMethod,
        deviceId: baseEvent.payload.deviceId,
        location: baseEvent.payload.location,
      },
      originalPayload: baseEvent.payload,
    };
  }
}

// Payment Events Normalizer
export class PaymentEventNormalizer extends BaseEventNormalizer {
  canHandle(eventType: string): boolean {
    return eventType.includes('payment_') || 
           eventType.includes('subscription_') ||
           eventType.includes('refund_');
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const baseEvent = this.parseBaseEvent(rawEvent);
    
    return {
      id: this.generateAuditId(baseEvent.id, baseEvent.tenantId),
      eventType: 'financial',
      eventName: baseEvent.eventType,
      tenantId: baseEvent.tenantId,
      userId: baseEvent.payload.customerId || baseEvent.payload.userId,
      aggregateType: baseEvent.aggregateType,
      aggregateId: baseEvent.aggregateId,
      timestamp: this.parseTimestamp(baseEvent.created),
      source: this.createSource(baseEvent.eventType, baseEvent.payload),
      actor: this.inferActor(baseEvent.payload),
      resource: {
        type: baseEvent.aggregateType,
        id: baseEvent.aggregateId,
        name: `${baseEvent.aggregateType} ${baseEvent.aggregateId}`,
        attributes: {
          amount: baseEvent.payload.amount,
          currency: baseEvent.payload.currency,
          paymentMethod: baseEvent.payload.paymentMethod,
          planName: baseEvent.payload.planName,
        },
      },
      action: this.inferAction(baseEvent.eventType, baseEvent.payload),
      metadata: {
        ...this.extractMetadata(baseEvent.payload),
        paymentProvider: baseEvent.payload.paymentProvider || 'stripe',
        transactionId: baseEvent.payload.transactionId,
        invoiceId: baseEvent.payload.invoiceId,
        riskScore: baseEvent.payload.riskScore,
      },
      originalPayload: baseEvent.payload,
    };
  }
}

// Support Events Normalizer
export class SupportEventNormalizer extends BaseEventNormalizer {
  canHandle(eventType: string): boolean {
    return eventType.includes('support_') || 
           eventType.includes('ticket_') ||
           eventType.includes('message_');
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const baseEvent = this.parseBaseEvent(rawEvent);
    
    return {
      id: this.generateAuditId(baseEvent.id, baseEvent.tenantId),
      eventType: 'support',
      eventName: baseEvent.eventType,
      tenantId: baseEvent.tenantId,
      userId: baseEvent.payload.customerId || baseEvent.payload.userId,
      aggregateType: baseEvent.aggregateType,
      aggregateId: baseEvent.aggregateId,
      timestamp: this.parseTimestamp(baseEvent.created),
      source: this.createSource(baseEvent.eventType, baseEvent.payload),
      actor: this.inferActor(baseEvent.payload),
      resource: {
        type: baseEvent.aggregateType,
        id: baseEvent.aggregateId,
        name: baseEvent.payload.subject || `${baseEvent.aggregateType} ${baseEvent.aggregateId}`,
        attributes: {
          priority: baseEvent.payload.priority,
          category: baseEvent.payload.category,
          status: baseEvent.payload.status,
        },
      },
      action: this.inferAction(baseEvent.eventType, baseEvent.payload),
      metadata: {
        ...this.extractMetadata(baseEvent.payload),
        assignedTo: baseEvent.payload.assignedTo,
        customerEmail: baseEvent.payload.customerEmail,
        channel: baseEvent.payload.channel,
      },
      originalPayload: baseEvent.payload,
    };
  }
}

// Tenant Events Normalizer
export class TenantEventNormalizer extends BaseEventNormalizer {
  canHandle(eventType: string): boolean {
    return eventType.includes('tenant.') || 
           eventType.includes('tenant_');
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const baseEvent = this.parseBaseEvent(rawEvent);
    
    // Map tenant-specific user ID fields
    const userId = baseEvent.payload.createdBy || 
                   baseEvent.payload.updatedBy || 
                   baseEvent.payload.deletedBy || 
                   baseEvent.payload.userId;
    
    return {
      id: this.generateAuditId(baseEvent.id, baseEvent.tenantId),
      eventType: 'tenant',
      eventName: baseEvent.eventType,
      tenantId: baseEvent.tenantId,
      userId: userId,
      aggregateType: baseEvent.aggregateType,
      aggregateId: baseEvent.aggregateId,
      timestamp: this.parseTimestamp(baseEvent.created),
      source: this.createSource(baseEvent.eventType, baseEvent.payload),
      actor: this.inferActor({
        ...baseEvent.payload,
        userId: userId, // Ensure inferActor can find the userId
      }),
      resource: {
        type: baseEvent.aggregateType,
        id: baseEvent.aggregateId,
        name: baseEvent.payload.name || baseEvent.payload.slug || `${baseEvent.aggregateType} ${baseEvent.aggregateId}`,
        attributes: {
          slug: baseEvent.payload.slug,
          plan: baseEvent.payload.plan,
          status: baseEvent.payload.status,
        },
      },
      action: this.inferAction(baseEvent.eventType, baseEvent.payload),
      metadata: {
        ...this.extractMetadata(baseEvent.payload),
        changes: baseEvent.payload.changes,
        previousState: baseEvent.payload.metadata?.previousState,
      },
      originalPayload: baseEvent.payload,
    };
  }
}

// Generic Event Normalizer (fallback)
export class GenericEventNormalizer extends BaseEventNormalizer {
  canHandle(eventType: string): boolean {
    return true; // Handles any event as fallback
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const baseEvent = this.parseBaseEvent(rawEvent);
    
    return {
      id: this.generateAuditId(baseEvent.id, baseEvent.tenantId),
      eventType: 'generic',
      eventName: baseEvent.eventType,
      tenantId: baseEvent.tenantId,
      userId: baseEvent.payload.userId,
      aggregateType: baseEvent.aggregateType,
      aggregateId: baseEvent.aggregateId,
      timestamp: this.parseTimestamp(baseEvent.created),
      source: this.createSource(baseEvent.eventType, baseEvent.payload),
      actor: this.inferActor(baseEvent.payload),
      resource: this.inferResource(baseEvent.aggregateType, baseEvent.aggregateId, baseEvent.payload),
      action: this.inferAction(baseEvent.eventType, baseEvent.payload),
      metadata: this.extractMetadata(baseEvent.payload),
      originalPayload: baseEvent.payload,
    };
  }
}

// Normalizer Registry
export class EventNormalizerRegistry {
  private normalizers: BaseEventNormalizer[] = [];

  constructor() {
    // Register normalizers in priority order (most specific first)
    this.normalizers = [
      new AuthEventNormalizer(),
      new PaymentEventNormalizer(),
      new SupportEventNormalizer(),
      new TenantEventNormalizer(),
      new GenericEventNormalizer(), // Always last (fallback)
    ];
  }

  async normalize(rawEvent: any): Promise<AuditEvent> {
    const eventType = rawEvent.eventType || rawEvent.eventName || 'unknown';
    
    for (const normalizer of this.normalizers) {
      if (normalizer.canHandle(eventType)) {
        return await normalizer.normalize(rawEvent);
      }
    }

    // Should never reach here due to GenericEventNormalizer
    throw new Error(`No normalizer found for event type: ${eventType}`);
  }

  addNormalizer(normalizer: BaseEventNormalizer) {
    // Insert before the generic normalizer (which should be last)
    this.normalizers.splice(-1, 0, normalizer);
  }
}