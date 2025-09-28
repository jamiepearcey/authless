import { z } from 'zod';
import type { OutboxEvent } from './generated/client';

/**
 * Outbox event status enum
 */
export enum OutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  DEAD = 'dead',
}

/**
 * Base outbox event schema for validation
 */
export const OutboxEventSchema = z.object({
  eventType: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  tenantId: z.string(),
  payloadJson: z.record(z.any()),
  idempotencyKey: z.string().optional(),
  traceId: z.string().optional(),
});

export type CreateOutboxEventInput = z.infer<typeof OutboxEventSchema>;

/**
 * Outbox event with typed payload
 */
export interface TypedOutboxEvent<T = Record<string, any>> extends Omit<OutboxEvent, 'payloadJson'> {
  payloadJson: T;
}

/**
 * Event payload for specific event types
 */
export interface UserEventPayload {
  userId: string;
  email: string;
  name?: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface PaymentEventPayload {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  customerId?: string;
  planName?: string;
  metadata?: Record<string, any>;
}

export interface NotificationEventPayload {
  notificationId: string;
  title: string;
  message: string;
  priority: string;
  recipients: Array<{
    userId: string;
    email: string;
    channel: string;
  }>;
  metadata?: Record<string, any>;
}

export interface SupportEventPayload {
  ticketId: string;
  subject: string;
  status: string;
  priority: string;
  customerEmail: string;
  assignedTo?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface InvitationEventPayload {
  invitationId: string;
  email: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  invitedByUserId: string;
  invitedByEmail: string;
  expiresAt: string;
  status: string;
  message?: string;
  // ID of the user record created for the invitee
  invitedUserId?: string;
  // ID of the membership record created
  membershipId?: string;
  metadata?: Record<string, any>;
}

/**
 * Event type constants
 */
export const EventTypes = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SIGNED_IN: 'user.signed_in',
  USER_SIGNED_OUT: 'user.signed_out',
  
  // Payment events
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  
  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // Support events
  SUPPORT_TICKET_CREATED: 'support.ticket.created',
  SUPPORT_TICKET_UPDATED: 'support.ticket.updated',
  SUPPORT_TICKET_ASSIGNED: 'support.ticket.assigned',
  SUPPORT_TICKET_CLOSED: 'support.ticket.closed',
  SUPPORT_MESSAGE_CREATED: 'support.message.created',
  
  // Lead events
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_ABANDONED: 'lead.abandoned',
  
  // Invitation events
  INVITATION_CREATED: 'invitation.created',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_REJECTED: 'invitation.rejected',
  INVITATION_EXPIRED: 'invitation.expired',
  
  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
  SYSTEM_INFO: 'system.info',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

/**
 * Aggregate type constants
 */
export const AggregateTypes = {
  USER: 'user',
  ORDER: 'order',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  NOTIFICATION: 'notification',
  SUPPORT_TICKET: 'support_ticket',
  SUPPORT_MESSAGE: 'support_message',
  LEAD: 'lead',
  INVITATION: 'invitation',
  SYSTEM: 'system',
} as const;

export type AggregateType = typeof AggregateTypes[keyof typeof AggregateTypes];

/**
 * Options for fetching pending events
 */
export interface FetchPendingEventsOptions {
  limit?: number;
  eventTypes?: string[];
  tenantId?: string;
  maxTries?: number;
}

/**
 * Options for updating event status
 */
export interface UpdateEventStatusOptions {
  status: OutboxEventStatus;
  error?: string;
  nextAttemptAt?: Date;
  incrementTries?: boolean;
}

/**
 * Outbox event statistics
 */
export interface OutboxEventStats {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  dead: number;
  oldestPending?: Date;
  averageProcessingTime?: number;
}

/**
 * Retry configuration for failed events
 */
export interface RetryConfig {
  maxTries: number;
  backoffMultiplier: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxTries: 5,
  backoffMultiplier: 2,
  baseDelayMs: 1000,
  maxDelayMs: 300000, // 5 minutes
};

/**
 * Calculate next attempt time based on retry configuration
 */
export function calculateNextAttemptAt(
  tries: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, tries),
    config.maxDelayMs
  );
  
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  
  return new Date(Date.now() + delay + jitter);
}

/**
 * Generate idempotency key from event data
 */
export function generateIdempotencyKey(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  tenantId: string,
  additionalData?: string
): string {
  const data = [eventType, aggregateType, aggregateId, tenantId, additionalData].filter(Boolean).join(':');
  
  // Simple hash function - in production, you might want to use crypto.createHash
  let hash = 0;
  if (data.length === 0) return hash.toString();
  
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Type guards for specific event payloads
 */
export function isUserEventPayload(payload: any): payload is UserEventPayload {
  return payload && typeof payload.userId === 'string' && typeof payload.email === 'string';
}

export function isPaymentEventPayload(payload: any): payload is PaymentEventPayload {
  return payload && typeof payload.paymentId === 'string' && typeof payload.amount === 'number';
}

export function isNotificationEventPayload(payload: any): payload is NotificationEventPayload {
  return payload && typeof payload.notificationId === 'string' && Array.isArray(payload.recipients);
}

export function isSupportEventPayload(payload: any): payload is SupportEventPayload {
  return payload && typeof payload.ticketId === 'string' && typeof payload.subject === 'string';
}