import fetch from 'node-fetch';
import crypto from 'crypto';
import type {
  Event,
  WebhookEndpoint,
  WebhookPayload,
  WebhookDeliveryResult,
} from './types.js';

/**
 * Webhook delivery service handles the actual HTTP delivery of webhooks
 */
export class WebhookDeliveryService {
  /**
   * Deliver a webhook to a specific endpoint
   */
  async deliverWebhook(
    event: Event,
    webhook: WebhookEndpoint,
    retryCount = 0
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId(event);
    
    const result: WebhookDeliveryResult = {
      webhookId: webhook.id,
      eventId,
      success: false,
      responseTime: 0,
      retryCount,
      deliveredAt: new Date(),
    };

    try {
      // Prepare webhook payload
      const payload: WebhookPayload = {
        id: eventId,
        event: event.eventName,
        created: event.created,
        data: event,
        webhook: {
          id: webhook.id,
          name: webhook.name,
        },
      };

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Beat-The-Fine-London-Webhooks/1.0',
        'X-Webhook-ID': webhook.id,
        'X-Event-Name': event.eventName,
        'X-Delivery-ID': eventId,
        'X-Retry-Count': retryCount.toString(),
        ...webhook.headers,
      };

      // Add signature if secret is provided
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
        headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
      }

      console.log(`🎯 Delivering webhook ${webhook.id} for event ${event.eventName} to ${webhook.url}`);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      try {
        // Make the HTTP request
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // Clear timeout since request completed
        clearTimeout(timeoutId);

        result.statusCode = response.status;
        result.responseTime = Date.now() - startTime;

        // Consider 2xx status codes as successful
        if (response.status >= 200 && response.status < 300) {
          result.success = true;
          console.log(`✅ Webhook ${webhook.id} delivered successfully (${response.status})`);
        } else {
          result.success = false;
          result.error = `HTTP ${response.status}: ${response.statusText}`;
          console.warn(`⚠️ Webhook ${webhook.id} failed with status ${response.status}`);
        }

      } catch (error: any) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        
        result.responseTime = Date.now() - startTime;
        result.error = error.message || 'Unknown error';
        result.success = false;
        
        console.error(`❌ Webhook ${webhook.id} delivery failed:`, error.message);
      }

    } catch (error: any) {
      // Handle any other errors (e.g., payload preparation, header generation)
      result.responseTime = Date.now() - startTime;
      result.error = error.message || 'Unknown error';
      result.success = false;
      
      console.error(`❌ Webhook ${webhook.id} preparation failed:`, error.message);
    }

    return result;
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliverWithRetry(
    event: Event,
    webhook: WebhookEndpoint
  ): Promise<WebhookDeliveryResult[]> {
    const results: WebhookDeliveryResult[] = [];
    let lastResult: WebhookDeliveryResult;

    for (let attempt = 0; attempt <= webhook.maxRetries; attempt++) {
      lastResult = await this.deliverWebhook(event, webhook, attempt);
      results.push(lastResult);

      if (lastResult.success) {
        console.log(`✅ Webhook ${webhook.id} delivered on attempt ${attempt + 1}`);
        break;
      }

      if (attempt < webhook.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        console.log(`🔄 Retrying webhook ${webhook.id} in ${delay}ms (attempt ${attempt + 1}/${webhook.maxRetries + 1})`);
        await this.sleep(delay);
      } else {
        console.error(`💥 Webhook ${webhook.id} failed after ${webhook.maxRetries + 1} attempts`);
      }
    }

    return results;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(event: Event): string {
    const timestamp = Date.now();
    const eventHash = crypto
      .createHash('md5')
      .update(JSON.stringify(event))
      .digest('hex')
      .substring(0, 8);
    return `evt_${timestamp}_${eventHash}`;
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. with jitter
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000; // Add up to 1s of jitter
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify webhook signature (for testing or validation)
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(cleanSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }
}