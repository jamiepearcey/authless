import { describe, it, expect, beforeEach } from 'vitest';
import { 
  NormalizerRegistry,
  AuthEventNormalizer,
  PaymentEventNormalizer,
  SupportEventNormalizer,
  GenericEventNormalizer
} from '../../src/normalizers/domain-normalizers';
import { AuditMessage } from '../../src/types';

describe('Event Normalizers Unit Tests', () => {
  let registry: NormalizerRegistry;

  beforeEach(() => {
    registry = new NormalizerRegistry();
  });

  describe('AuthEventNormalizer', () => {
    it('should normalize user_logged_in events correctly', () => {
      const normalizer = new AuthEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'auth',
        eventName: 'user_logged_in',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'user',
        aggregateId: 'user-123',
        source: {
          service: 'auth-service',
          version: '1.0.0',
          host: 'auth-host',
          requestId: 'req-123',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        resource: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        action: {
          type: 'authentication',
          description: 'User login',
          outcome: 'success',
        },
        metadata: { loginMethod: 'password' },
        originalPayload: { attemptId: 'attempt-123' },
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.eventType).toBe('auth');
      expect(normalized.eventName).toBe('user_logged_in');
      expect(normalized.action.type).toBe('authentication');
      expect(normalized.action.outcome).toBe('success');
    });

    it('should handle failed login attempts', () => {
      const normalizer = new AuthEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'auth',
        eventName: 'user_logged_in',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'user',
        aggregateId: 'user-123',
        source: {
          service: 'auth-service',
          version: '1.0.0',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        resource: null,
        action: {
          type: 'authentication',
          description: 'Failed user login',
          outcome: 'failure',
          reason: 'Invalid credentials',
        },
        metadata: { 
          loginMethod: 'password',
          failureReason: 'INVALID_PASSWORD'
        },
        originalPayload: {},
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.action.outcome).toBe('failure');
      expect(normalized.action.reason).toBe('Invalid credentials');
      expect(JSON.parse(normalized.metadata).failureReason).toBe('INVALID_PASSWORD');
    });
  });

  describe('PaymentEventNormalizer', () => {
    it('should normalize payment_completed events correctly', () => {
      const normalizer = new PaymentEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'payment',
        eventName: 'payment_completed',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'payment',
        aggregateId: 'payment-456',
        source: {
          service: 'payment-service',
          version: '1.0.0',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        resource: {
          type: 'payment',
          id: 'payment-456',
          attributes: {
            amount: 1000,
            currency: 'GBP',
            status: 'completed'
          },
        },
        action: {
          type: 'payment_processing',
          description: 'Payment processed successfully',
          outcome: 'success',
        },
        metadata: { 
          paymentMethod: 'card',
          merchantId: 'merchant-123'
        },
        originalPayload: {
          stripePaymentId: 'pi_1234567890',
        },
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.eventType).toBe('payment');
      expect(normalized.eventName).toBe('payment_completed');
      expect(normalized.action.type).toBe('payment_processing');
      expect(normalized.resourceType).toBe('payment');
      expect(normalized.resourceId).toBe('payment-456');
      expect(JSON.parse(normalized.metadata).paymentMethod).toBe('card');
    });

    it('should normalize payment_failed events correctly', () => {
      const normalizer = new PaymentEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'payment',
        eventName: 'payment_failed',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'payment',
        aggregateId: 'payment-789',
        source: {
          service: 'payment-service',
          version: '1.0.0',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        resource: {
          type: 'payment',
          id: 'payment-789',
          attributes: {
            amount: 2000,
            currency: 'GBP',
            status: 'failed'
          },
        },
        action: {
          type: 'payment_processing',
          description: 'Payment processing failed',
          outcome: 'failure',
          reason: 'Insufficient funds',
        },
        metadata: { 
          paymentMethod: 'card',
          errorCode: 'INSUFFICIENT_FUNDS'
        },
        originalPayload: {},
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.action.outcome).toBe('failure');
      expect(normalized.action.reason).toBe('Insufficient funds');
      expect(JSON.parse(normalized.metadata).errorCode).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('SupportEventNormalizer', () => {
    it('should normalize support_ticket_created events correctly', () => {
      const normalizer = new SupportEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'support',
        eventName: 'support_ticket_created',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'support_ticket',
        aggregateId: 'ticket-789',
        source: {
          service: 'support-service',
          version: '1.0.0',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        resource: {
          type: 'support_ticket',
          id: 'ticket-789',
          name: 'Payment Issue',
          attributes: {
            priority: 'high',
            status: 'open',
            category: 'payment'
          },
        },
        action: {
          type: 'support_management',
          description: 'Support ticket created',
          outcome: 'success',
        },
        metadata: { 
          source: 'contact_form',
          urgency: 'high'
        },
        originalPayload: {},
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.eventType).toBe('support');
      expect(normalized.eventName).toBe('support_ticket_created');
      expect(normalized.action.type).toBe('support_management');
      expect(normalized.resourceType).toBe('support_ticket');
      expect(normalized.resourceName).toBe('Payment Issue');
    });
  });

  describe('GenericEventNormalizer', () => {
    it('should handle unknown event types', () => {
      const normalizer = new GenericEventNormalizer();
      
      const mockMessage: AuditMessage = {
        id: 'test-id',
        eventType: 'custom',
        eventName: 'custom_event',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'custom_resource',
        aggregateId: 'resource-123',
        source: {
          service: 'custom-service',
          version: '1.0.0',
        },
        actor: {
          type: 'user',
          id: 'user-123',
          name: 'Test User',
        },
        resource: {
          type: 'custom_resource',
          id: 'resource-123',
          name: 'Custom Resource',
        },
        action: {
          type: 'custom_action',
          description: 'Custom action performed',
          outcome: 'success',
        },
        metadata: { customField: 'customValue' },
        originalPayload: { customPayload: 'data' },
      };

      const normalized = normalizer.normalize(mockMessage);

      expect(normalized.eventType).toBe('custom');
      expect(normalized.eventName).toBe('custom_event');
      expect(normalized.action.type).toBe('custom_action');
      expect(normalized.resourceType).toBe('custom_resource');
    });
  });

  describe('NormalizerRegistry', () => {
    it('should route events to correct normalizers', () => {
      const authMessage: AuditMessage = {
        id: 'auth-id',
        eventType: 'auth',
        eventName: 'user_logged_in',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        aggregateType: 'user',
        aggregateId: 'user-123',
        source: { service: 'auth-service', version: '1.0.0' },
        actor: { type: 'user', id: 'user-123', name: 'Test User' },
        resource: null,
        action: { type: 'authentication', description: 'Login', outcome: 'success' },
        metadata: {},
        originalPayload: {},
      };

      const normalized = registry.normalize(authMessage);
      expect(normalized.eventType).toBe('auth');
      expect(normalized.action.type).toBe('authentication');
    });

    it('should fall back to generic normalizer for unknown types', () => {
      const unknownMessage: AuditMessage = {
        id: 'unknown-id',
        eventType: 'unknown',
        eventName: 'unknown_event',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        aggregateType: 'unknown',
        aggregateId: 'unknown-123',
        source: { service: 'unknown-service', version: '1.0.0' },
        actor: { type: 'system', id: 'system', name: 'System' },
        resource: null,
        action: { type: 'unknown', description: 'Unknown action', outcome: 'success' },
        metadata: {},
        originalPayload: {},
      };

      const normalized = registry.normalize(unknownMessage);
      expect(normalized.eventType).toBe('unknown');
      expect(normalized.eventName).toBe('unknown_event');
    });

    it('should allow registering custom normalizers', () => {
      class CustomNormalizer extends GenericEventNormalizer {
        canHandle(eventType: string): boolean {
          return eventType === 'custom';
        }

        normalize(message: AuditMessage): any {
          const base = super.normalize(message);
          return {
            ...base,
            customField: 'added by custom normalizer',
          };
        }
      }

      registry.register(new CustomNormalizer());

      const customMessage: AuditMessage = {
        id: 'custom-id',
        eventType: 'custom',
        eventName: 'custom_event',
        tenantId: 'tenant-1',
        timestamp: new Date(),
        aggregateType: 'custom',
        aggregateId: 'custom-123',
        source: { service: 'custom-service', version: '1.0.0' },
        actor: { type: 'user', id: 'user-123', name: 'Test User' },
        resource: null,
        action: { type: 'custom', description: 'Custom action', outcome: 'success' },
        metadata: {},
        originalPayload: {},
      };

      const normalized = registry.normalize(customMessage);
      expect(normalized.customField).toBe('added by custom normalizer');
    });
  });
});