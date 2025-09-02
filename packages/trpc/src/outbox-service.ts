import { OutboxRepository, type CreateOutboxEventInput } from "@db/base";
import { PrismaClient } from "@db/base";
import {
  EventTypes,
  AggregateTypes,
  generateIdempotencyKey,
  type EventType,
  type AggregateType,
  type UserEventPayload,
  type PaymentEventPayload,
  type NotificationEventPayload,
  type SupportEventPayload,
} from "@db/base";

/**
 * Outbox service for tRPC procedures
 * Provides easy methods to publish domain events to the outbox pattern
 */
export class TrpcOutboxService {
  private outboxRepository: OutboxRepository;

  constructor(private db: PrismaClient) {
    this.outboxRepository = new OutboxRepository(db);
  }

  /**
   * Publish a user-related event
   */
  async publishUserEvent(
    eventType: EventType,
    userId: string,
    tenantId: string | null,
    payload: UserEventPayload,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType: AggregateTypes.USER,
      aggregateId: userId,
      tenantId: tenantId || "",
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        AggregateTypes.USER,
        userId,
        tenantId || "",
        payload.action
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Publish a tenant-related event
   */
  async publishTenantEvent(
    eventType: EventType,
    tenantId: string,
    payload: Record<string, any>,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType: 'tenant' as AggregateType,
      aggregateId: tenantId,
      tenantId,
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        'tenant',
        tenantId,
        tenantId
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Publish a support-related event
   */
  async publishSupportEvent(
    eventType: EventType,
    supportId: string,
    tenantId: string | null,
    payload: SupportEventPayload,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType: AggregateTypes.SUPPORT_TICKET,
      aggregateId: supportId,
      tenantId: tenantId || "",
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        AggregateTypes.SUPPORT_TICKET,
        supportId,
        tenantId || ""
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Publish a notification event
   */
  async publishNotificationEvent(
    eventType: EventType,
    notificationId: string,
    tenantId: string | null,
    payload: NotificationEventPayload,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType: AggregateTypes.NOTIFICATION,
      aggregateId: notificationId,
      tenantId: tenantId || "",
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        AggregateTypes.NOTIFICATION,
        notificationId,
        tenantId || ""
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Publish a payment-related event
   */
  async publishPaymentEvent(
    eventType: EventType,
    paymentId: string,
    tenantId: string | null,
    payload: PaymentEventPayload,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType: AggregateTypes.PAYMENT,
      aggregateId: paymentId,
      tenantId: tenantId || "",
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        AggregateTypes.PAYMENT,
        paymentId,
        tenantId || ""
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Generic event publishing method
   */
  async publishEvent(
    eventType: EventType,
    aggregateType: AggregateType,
    aggregateId: string,
    tenantId: string | null,
    payload: Record<string, any>,
    options?: { idempotencyKey?: string; traceId?: string }
  ): Promise<string> {
    const input: CreateOutboxEventInput = {
      eventType,
      aggregateType,
      aggregateId,
      tenantId: tenantId || "",
      payloadJson: payload,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(
        eventType,
        aggregateType,
        aggregateId,
        tenantId || ""
      ),
      traceId: options?.traceId,
    };

    return await this.outboxRepository.createEvent(input);
  }

  /**
   * Get outbox statistics
   */
  async getStats(tenantId?: string) {
    return await this.outboxRepository.getStats(tenantId);
  }

  /**
   * Get events by tenant
   */
  async getEventsByTenant(tenantId: string, limit: number = 100) {
    return await this.outboxRepository.getEventsByTenant(tenantId, limit);
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string, limit: number = 100) {
    return await this.outboxRepository.getEventsByType(eventType, limit);
  }
}

// Create a singleton instance for use across tRPC procedures
let trpcOutboxService: TrpcOutboxService | null = null;

export function getTrpcOutboxService(db: PrismaClient): TrpcOutboxService {
  if (!trpcOutboxService) {
    trpcOutboxService = new TrpcOutboxService(db);
  }
  return trpcOutboxService;
}

// Export convenience methods for common events
export const OutboxEvents = {
  // User events
  USER_REGISTERED: EventTypes.USER_REGISTERED,
  USER_UPDATED: EventTypes.USER_UPDATED,
  USER_DELETED: EventTypes.USER_DELETED,
  USER_SIGNED_IN: EventTypes.USER_SIGNED_IN,
  USER_SIGNED_OUT: EventTypes.USER_SIGNED_OUT,

  // Support events
  SUPPORT_TICKET_CREATED: EventTypes.SUPPORT_TICKET_CREATED,
  SUPPORT_TICKET_UPDATED: EventTypes.SUPPORT_TICKET_UPDATED,
  SUPPORT_TICKET_ASSIGNED: EventTypes.SUPPORT_TICKET_ASSIGNED,
  SUPPORT_TICKET_CLOSED: EventTypes.SUPPORT_TICKET_CLOSED,
  SUPPORT_MESSAGE_CREATED: EventTypes.SUPPORT_MESSAGE_CREATED,

  // Tenant events (extending existing types)
  TENANT_CREATED: 'tenant.created' as EventType,
  TENANT_UPDATED: 'tenant.updated' as EventType,
  TENANT_DELETED: 'tenant.deleted' as EventType,
  TENANT_MEMBER_ADDED: 'tenant.member.added' as EventType,
  TENANT_MEMBER_REMOVED: 'tenant.member.removed' as EventType,

  // Authentication events
  AUTH_LOGIN_INITIATED: 'auth.login.initiated' as EventType,
  AUTH_LOGIN_COMPLETED: 'auth.login.completed' as EventType,
  AUTH_2FA_ENABLED: 'auth.2fa.enabled' as EventType,
  AUTH_2FA_DISABLED: 'auth.2fa.disabled' as EventType,
  AUTH_PASSWORD_CHANGED: 'auth.password.changed' as EventType,
} as const;