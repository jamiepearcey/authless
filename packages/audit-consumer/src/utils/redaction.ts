import crypto from 'crypto';
import { AuditEvent } from '../types';

export interface RedactionRule {
  field: string;
  action: 'remove' | 'hash' | 'mask';
}

export class DataRedactor {
  private rules: RedactionRule[];
  
  constructor(rules: RedactionRule[] = []) {
    this.rules = rules;
  }

  addRule(rule: RedactionRule): void {
    this.rules.push(rule);
  }

  redactAuditEvent(event: AuditEvent): AuditEvent {
    const redacted = { ...event };
    
    // Redact actor information
    if (redacted.actor) {
      redacted.actor = this.redactObject(redacted.actor);
    }
    
    // Redact metadata
    if (redacted.metadata) {
      redacted.metadata = this.redactObject(redacted.metadata);
    }
    
    // Redact original payload
    redacted.originalPayload = this.redactObject(redacted.originalPayload);
    
    // Redact resource attributes
    if (redacted.resource?.attributes) {
      redacted.resource.attributes = this.redactObject(redacted.resource.attributes);
    }
    
    return redacted;
  }

  private redactObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item));
    }

    const redacted = { ...obj };
    
    for (const rule of this.rules) {
      if (this.hasField(redacted, rule.field)) {
        const value = this.getFieldValue(redacted, rule.field);
        const redactedValue = this.applyRedaction(value, rule.action);
        this.setFieldValue(redacted, rule.field, redactedValue);
      }
    }

    // Recursively redact nested objects
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value);
      }
    }

    return redacted;
  }

  private hasField(obj: any, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }
      
      if (!(part in current)) {
        return false;
      }
      
      current = current[part];
    }
    
    return true;
  }

  private getFieldValue(obj: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      current = current[part];
    }
    
    return current;
  }

  private setFieldValue(obj: any, fieldPath: string, value: any): void {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private applyRedaction(value: any, action: 'remove' | 'hash' | 'mask'): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (action) {
      case 'remove':
        return undefined;
        
      case 'hash':
        return this.hashValue(value);
        
      case 'mask':
        return this.maskValue(value);
        
      default:
        return value;
    }
  }

  private hashValue(value: any): string {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return crypto
      .createHash('sha256')
      .update(stringValue)
      .digest('hex')
      .substring(0, 16); // Truncate for readability
  }

  private maskValue(value: any): string {
    if (typeof value !== 'string') {
      return '[MASKED]';
    }

    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    // Show first and last 2 characters, mask the middle
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
}

// Common redaction rules
export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  { field: 'password', action: 'remove' },
  { field: 'token', action: 'hash' },
  { field: 'secret', action: 'remove' },
  { field: 'apiKey', action: 'remove' },
  { field: 'email', action: 'hash' },
  { field: 'phone', action: 'mask' },
  { field: 'ssn', action: 'hash' },
  { field: 'creditCard', action: 'mask' },
  { field: 'bankAccount', action: 'mask' },
  
  // Nested field patterns
  { field: 'user.password', action: 'remove' },
  { field: 'user.email', action: 'hash' },
  { field: 'actor.email', action: 'hash' },
  { field: 'payment.cardNumber', action: 'mask' },
  { field: 'payment.cvv', action: 'remove' },
  { field: 'auth.refreshToken', action: 'remove' },
  { field: 'auth.accessToken', action: 'hash' },
];

// PII Detection utilities
export class PIIDetector {
  private static emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  private static ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
  private static creditCardRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  
  static detectPII(text: string): string[] {
    const detected: string[] = [];
    
    if (this.emailRegex.test(text)) {
      detected.push('email');
    }
    
    if (this.phoneRegex.test(text)) {
      detected.push('phone');
    }
    
    if (this.ssnRegex.test(text)) {
      detected.push('ssn');
    }
    
    if (this.creditCardRegex.test(text)) {
      detected.push('creditCard');
    }
    
    return detected;
  }
  
  static sanitizeText(text: string): string {
    let sanitized = text;
    
    sanitized = sanitized.replace(this.emailRegex, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(this.phoneRegex, '[PHONE_REDACTED]');
    sanitized = sanitized.replace(this.ssnRegex, '[SSN_REDACTED]');
    sanitized = sanitized.replace(this.creditCardRegex, '[CARD_REDACTED]');
    
    return sanitized;
  }
}