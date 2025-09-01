import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DataRedactor, 
  PIIDetector, 
  DEFAULT_REDACTION_RULES,
  RedactionRule 
} from '../../src/utils/redaction';
import { AuditEvent } from '../../src/types';

describe('Data Redaction Unit Tests', () => {
  let redactor: DataRedactor;

  beforeEach(() => {
    redactor = new DataRedactor(DEFAULT_REDACTION_RULES);
  });

  describe('DataRedactor', () => {
    it('should redact sensitive fields from audit events', () => {
      const auditEvent: AuditEvent = {
        id: 'test-id',
        eventType: 'auth',
        eventName: 'user_logged_in',
        tenantId: 'tenant-1',
        userId: 'user-123',
        timestamp: new Date(),
        aggregateType: 'user',
        aggregateId: 'user-123',
        sourceService: 'auth-service',
        sourceVersion: '1.0.0',
        sourceHost: 'auth-host',
        requestId: 'req-123',
        actorType: 'user',
        actorId: 'user-123',
        actorName: 'Test User',
        actorEmail: 'test@example.com', // Should be hashed
        actorIpAddress: '192.168.1.1',
        resourceType: 'user',
        resourceId: 'user-123',
        actionType: 'authentication',
        actionDescription: 'User login',
        actionOutcome: 'success',
        metadata: JSON.stringify({ 
          password: 'secret123',  // Should be removed
          token: 'abc123',       // Should be hashed
          loginMethod: 'password'
        }),
        originalPayload: JSON.stringify({
          user: {
            email: 'test@example.com', // Should be hashed
            password: 'secret123'      // Should be removed
          },
          auth: {
            accessToken: 'token123',   // Should be hashed
            refreshToken: 'refresh123' // Should be removed
          }
        }),
        createdAt: new Date(),
      };

      const redacted = redactor.redactAuditEvent(auditEvent);

      // Actor email should be hashed
      expect(redacted.actorEmail).not.toBe('test@example.com');
      expect(redacted.actorEmail).toMatch(/^[a-f0-9]{16}$/);

      // Metadata should have password removed and token hashed
      const redactedMetadata = JSON.parse(redacted.metadata);
      expect(redactedMetadata.password).toBeUndefined();
      expect(redactedMetadata.token).not.toBe('abc123');
      expect(redactedMetadata.token).toMatch(/^[a-f0-9]{16}$/);
      expect(redactedMetadata.loginMethod).toBe('password'); // Unchanged

      // Original payload should have nested redaction
      const redactedPayload = JSON.parse(redacted.originalPayload);
      expect(redactedPayload.user.password).toBeUndefined();
      expect(redactedPayload.user.email).not.toBe('test@example.com');
      expect(redactedPayload.auth.refreshToken).toBeUndefined();
      expect(redactedPayload.auth.accessToken).not.toBe('token123');
    });

    it('should handle mask action correctly', () => {
      const maskRules: RedactionRule[] = [
        { field: 'phone', action: 'mask' },
        { field: 'creditCard', action: 'mask' }
      ];

      const maskRedactor = new DataRedactor(maskRules);

      const testData = {
        phone: '07123456789',
        creditCard: '4111111111111111',
        other: 'keep this'
      };

      const redacted = maskRedactor.redactObject(testData);

      expect(redacted.phone).toBe('07*******89');
      expect(redacted.creditCard).toBe('41***********11');
      expect(redacted.other).toBe('keep this');
    });

    it('should handle nested field paths', () => {
      const nestedRules: RedactionRule[] = [
        { field: 'user.email', action: 'hash' },
        { field: 'payment.cardNumber', action: 'mask' },
        { field: 'auth.password', action: 'remove' }
      ];

      const nestedRedactor = new DataRedactor(nestedRules);

      const testData = {
        user: {
          email: 'test@example.com',
          name: 'Test User'
        },
        payment: {
          cardNumber: '4111111111111111',
          amount: 1000
        },
        auth: {
          password: 'secret123',
          method: 'login'
        }
      };

      const redacted = nestedRedactor.redactObject(testData);

      expect(redacted.user.email).not.toBe('test@example.com');
      expect(redacted.user.email).toMatch(/^[a-f0-9]{16}$/);
      expect(redacted.user.name).toBe('Test User');
      
      expect(redacted.payment.cardNumber).toBe('41***********11');
      expect(redacted.payment.amount).toBe(1000);
      
      expect(redacted.auth.password).toBeUndefined();
      expect(redacted.auth.method).toBe('login');
    });

    it('should handle arrays correctly', () => {
      const arrayRules: RedactionRule[] = [
        { field: 'email', action: 'hash' }
      ];

      const arrayRedactor = new DataRedactor(arrayRules);

      const testData = {
        users: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' }
        ],
        contacts: [
          { email: 'contact1@example.com', phone: '123456789' },
          { email: 'contact2@example.com', phone: '987654321' }
        ]
      };

      const redacted = arrayRedactor.redactObject(testData);

      expect(redacted.users[0].email).not.toBe('user1@example.com');
      expect(redacted.users[0].email).toMatch(/^[a-f0-9]{16}$/);
      expect(redacted.users[0].name).toBe('User 1');

      expect(redacted.contacts[1].email).not.toBe('contact2@example.com');
      expect(redacted.contacts[1].phone).toBe('987654321');
    });

    it('should handle null and undefined values gracefully', () => {
      const testData = {
        email: null,
        password: undefined,
        token: 'valid-token',
        nested: {
          email: null,
          password: 'secret'
        }
      };

      const redacted = redactor.redactAuditEvent({
        ...mockAuditEvent(),
        originalPayload: JSON.stringify(testData)
      });

      const redactedPayload = JSON.parse(redacted.originalPayload);
      expect(redactedPayload.email).toBeNull();
      expect(redactedPayload.password).toBeUndefined();
      expect(redactedPayload.token).not.toBe('valid-token');
      expect(redactedPayload.nested.email).toBeNull();
      expect(redactedPayload.nested.password).toBeUndefined();
    });

    it('should allow adding custom rules', () => {
      redactor.addRule({ field: 'customSecret', action: 'remove' });

      const testData = {
        customSecret: 'top-secret',
        normalField: 'keep this'
      };

      const redacted = redactor.redactObject(testData);

      expect(redacted.customSecret).toBeUndefined();
      expect(redacted.normalField).toBe('keep this');
    });
  });

  describe('PIIDetector', () => {
    it('should detect email addresses', () => {
      const text = 'Please contact support at help@example.com or admin@test.org for assistance';
      const detected = PIIDetector.detectPII(text);
      
      expect(detected).toContain('email');
    });

    it('should detect phone numbers', () => {
      const text = 'Call us at 123-456-7890 or 555.123.4567';
      const detected = PIIDetector.detectPII(text);
      
      expect(detected).toContain('phone');
    });

    it('should detect SSN', () => {
      const text = 'SSN: 123-45-6789';
      const detected = PIIDetector.detectPII(text);
      
      expect(detected).toContain('ssn');
    });

    it('should detect credit card numbers', () => {
      const text = 'Card number: 4111 1111 1111 1111';
      const detected = PIIDetector.detectPII(text);
      
      expect(detected).toContain('creditCard');
    });

    it('should detect multiple PII types', () => {
      const text = 'User john@doe.com with phone 123-456-7890 and SSN 123-45-6789';
      const detected = PIIDetector.detectPII(text);
      
      expect(detected).toContain('email');
      expect(detected).toContain('phone');
      expect(detected).toContain('ssn');
    });

    it('should sanitize text by replacing PII', () => {
      const text = 'Contact john@doe.com at 123-456-7890, SSN: 123-45-6789, Card: 4111 1111 1111 1111';
      const sanitized = PIIDetector.sanitizeText(text);
      
      expect(sanitized).not.toContain('john@doe.com');
      expect(sanitized).not.toContain('123-456-7890');
      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).not.toContain('4111 1111 1111 1111');
      
      expect(sanitized).toContain('[EMAIL_REDACTED]');
      expect(sanitized).toContain('[PHONE_REDACTED]');
      expect(sanitized).toContain('[SSN_REDACTED]');
      expect(sanitized).toContain('[CARD_REDACTED]');
    });

    it('should handle text with no PII', () => {
      const text = 'This is a normal message with no sensitive information';
      const detected = PIIDetector.detectPII(text);
      const sanitized = PIIDetector.sanitizeText(text);
      
      expect(detected).toHaveLength(0);
      expect(sanitized).toBe(text);
    });
  });

  describe('DEFAULT_REDACTION_RULES', () => {
    it('should include common sensitive field patterns', () => {
      const fieldNames = DEFAULT_REDACTION_RULES.map(rule => rule.field);
      
      expect(fieldNames).toContain('password');
      expect(fieldNames).toContain('token');
      expect(fieldNames).toContain('secret');
      expect(fieldNames).toContain('apiKey');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('ssn');
      expect(fieldNames).toContain('creditCard');
    });

    it('should include nested field patterns', () => {
      const fieldNames = DEFAULT_REDACTION_RULES.map(rule => rule.field);
      
      expect(fieldNames).toContain('user.password');
      expect(fieldNames).toContain('user.email');
      expect(fieldNames).toContain('actor.email');
      expect(fieldNames).toContain('payment.cardNumber');
      expect(fieldNames).toContain('auth.refreshToken');
    });

    it('should have appropriate actions for different field types', () => {
      const passwordRule = DEFAULT_REDACTION_RULES.find(r => r.field === 'password');
      const emailRule = DEFAULT_REDACTION_RULES.find(r => r.field === 'email');
      const phoneRule = DEFAULT_REDACTION_RULES.find(r => r.field === 'phone');
      
      expect(passwordRule?.action).toBe('remove');
      expect(emailRule?.action).toBe('hash');
      expect(phoneRule?.action).toBe('mask');
    });
  });

  // Helper function to create mock audit event
  function mockAuditEvent(): AuditEvent {
    return {
      id: 'test-id',
      eventType: 'test',
      eventName: 'test_event',
      tenantId: 'tenant-1',
      userId: 'user-123',
      timestamp: new Date(),
      aggregateType: 'test',
      aggregateId: 'test-123',
      sourceService: 'test-service',
      sourceVersion: '1.0.0',
      actionType: 'test',
      actionDescription: 'Test action',
      actionOutcome: 'success',
      metadata: '{}',
      originalPayload: '{}',
      createdAt: new Date(),
    };
  }
});