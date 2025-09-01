import fetch from 'node-fetch';
import type { CentrifugoConfig, RealtimeMessage } from './types.js';

/**
 * Centrifugo HTTP API Client for publishing messages
 */
export class CentrifugoClient {
  constructor(private readonly config: CentrifugoConfig) {
    this.validateConfig();
  }

  /**
   * Validate client configuration
   */
  private validateConfig(): void {
    if (!this.config.apiUrl) {
      throw new Error('Centrifugo API URL is required');
    }
    if (!this.config.apiKey) {
      throw new Error('Centrifugo API key is required');
    }
  }

  /**
   * Publish a message to a specific channel
   */
  async publish(channel: string, message: RealtimeMessage): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📡 Publishing to Centrifugo channel: ${channel}`);

      const payload = {
        method: 'publish',
        params: {
          channel,
          data: message,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

      try {
        const response = await fetch(`${this.config.apiUrl}/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${this.config.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

                clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json() as any;
        
        if (result.error) {
          throw new Error(`Centrifugo API error: ${result.error.message || 'Unknown error'}`);
        }

        console.log(`✅ Message published to channel ${channel}`);
        return { success: true };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to publish to channel ${channel}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Publish a message to multiple channels
   */
  async publishToMultipleChannels(
    channels: string[],
    message: RealtimeMessage
  ): Promise<Array<{ channel: string; success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      channels.map(channel => 
        this.publish(channel, message).then(result => ({ channel, ...result }))
      )
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          channel: 'unknown',
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channel: string): Promise<any> {
    try {
      const payload = {
        method: 'info',
        params: {},
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

      try {
        const response = await fetch(`${this.config.apiUrl}/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${this.config.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        console.error(`❌ Failed to get channel info for ${channel}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`❌ Failed to get channel info for ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Get list of active channels
   */
  async getChannels(): Promise<string[]> {
    try {
      const payload = {
        method: 'channels',
        params: {},
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

      try {
        const response = await fetch(`${this.config.apiUrl}/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${this.config.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as any;
        
        if (result.error) {
          throw new Error(`Centrifugo API error: ${result.error.message}`);
        }

        return Object.keys(result.result?.channels || {});

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to get channels list:', error);
      throw error;
    }
  }

  /**
   * Get server statistics
   */
  async getStats(): Promise<any> {
    try {
      const payload = {
        method: 'info',
        params: {},
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

      try {
        const response = await fetch(`${this.config.apiUrl}/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${this.config.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return (result as any).result;

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to get Centrifugo stats:', error);
      throw error;
    }
  }

  /**
   * Health check for Centrifugo connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        details: {
          version: stats.version,
          nodes: stats.nodes?.length || 0,
          uptime: stats.nodes?.[0]?.uptime || 0,
          connections: stats.nodes?.[0]?.num_clients || 0,
          channels: stats.nodes?.[0]?.num_channels || 0,
          api_url: this.config.apiUrl,
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          api_url: this.config.apiUrl,
        }
      };
    }
  }
}