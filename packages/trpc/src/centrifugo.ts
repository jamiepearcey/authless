import crypto from "crypto";

// Centrifugo server-side integration
export class CentrifugoService {
  private apiKey: string;
  private apiUrl: string;
  private tokenHmacSecretKey: string;

  constructor() {
    this.apiKey = process.env.CENTRIFUGO_API_KEY || "your-api-key-change-in-production";
    this.apiUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
    this.tokenHmacSecretKey = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY || "your-secret-key-change-in-production";
    
    // Log configuration for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Centrifugo service initialized:', {
        apiUrl: this.apiUrl,
        hasApiKey: !!this.apiKey,
        hasTokenSecret: !!this.tokenHmacSecretKey,
      });
    }
  }

  // Generate JWT token for user authentication
  generateToken(userId: string, expirationTime?: number): string {
    const header = {
      typ: "JWT",
      alg: "HS256"
    };

    const payload: any = {
      sub: userId, // subject (user ID)
      iat: Math.floor(Date.now() / 1000), // issued at
    };

    if (expirationTime) {
      payload.exp = Math.floor(Date.now() / 1000) + expirationTime; // expiration time
    }

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.tokenHmacSecretKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Publish message to a channel
  async publish(channel: string, data: any): Promise<boolean> {
    try {
        const url = `${this.apiUrl}/api/publish`
      console.log('🔍 [publish] Publishing to channel:', channel, 'data:', data, url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": `${this.apiKey}`,
        },
        body: JSON.stringify({
          commands: [
            {
                publish:{
                    channel,
                    data,
                }
            },
          ],
        }),
      });

      console.log('🔍 [publish] HTTP response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [publish] HTTP error:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('🔍 [publish] HTTP response:', result);
      
      // Check if Centrifugo returned an error in the response body
      if (result.error) {
        console.error('🔍 [publish] Centrifugo error:', result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('🔍 [publish] Error:', error);
      return false;
    }
  }

  // Publish to multiple channels at once
  async publishBatch(publications: Array<{ channel: string; data: any }>): Promise<boolean> {
    try {
      console.log('🔍 [publishBatch] Publishing batch:', publications.length, 'publications');
      console.log('🔍 [publishBatch] Using API key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'none');
      console.log('🔍 [publishBatch] API URL:', this.apiUrl);
      
      const commands = publications.map(pub => ({
        publish:{
            channel: pub.channel,
            data: pub.data,
        }
      }));

      console.log('🔍 [publishBatch] Commands being sent:', commands);

      const response = await fetch(`${this.apiUrl}/api/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
        body: JSON.stringify({ commands }),
      });

      console.log('🔍 [publishBatch] HTTP response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [publishBatch] HTTP error:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('🔍 [publishBatch] HTTP response:', JSON.stringify(result));
      
      // Check if Centrifugo returned an error in the response body
      if (result.error) {
        console.error('🔍 [publishBatch] Centrifugo error:', result.error);
        console.log('🔍 [publishBatch] Error result:', JSON.stringify(result), JSON.stringify(commands));
      }
      
      return true;
    } catch (error) {
      console.error('🔍 [publishBatch] Error:', error);
      return false;
    }
  }

  // Get channel presence (who's connected to a channel)
  async getPresence(channel: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `apikey ${this.apiKey}`,
        },
        body: JSON.stringify({
          channel,
        }),
      });

      if (!response.ok) {
        console.error('Failed to get presence from Centrifugo:', response.statusText);
        return null;
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Error getting presence from Centrifugo:', error);
      return null;
    }
  }

  // Generate channel names for publishing (based on notification dispatch model)
  generatePublishChannels(notificationScope: {
    tenantId?: string | null;
    role?: string | null; 
    userId?: string | null;
  }): string[] {
    const channels: string[] = [];

    if (notificationScope.userId) {
      // User-specific notification
      channels.push(`notifications:user:${notificationScope.userId}`);
    } else if (notificationScope.tenantId && notificationScope.role) {
      // Role-specific notification within a tenant
      channels.push(`notifications:tenant:${notificationScope.tenantId}:role:${notificationScope.role}`);
    } else if (notificationScope.tenantId) {
      // Tenant-wide notification
      channels.push(`notifications:tenant:${notificationScope.tenantId}`);
    } else {
      // Global notification to all users
      channels.push('notifications:global');
    }

    console.log('🔍 [generatePublishChannels] Generated channels:', channels, 'for scope:', notificationScope);
    return channels;
  }

  // Generate channel names for user subscription (all channels a user should subscribe to)
  generateChannels(notificationScope: {
    tenantId?: string | null;
    role?: string | null;
    userId?: string | null;
  }): string[] {
    const channels: string[] = [];
    const { userId, tenantId, role } = notificationScope;

    // All users should subscribe to global notifications
    channels.push('notifications:global');

    // User-specific channel
    if (userId) {
      channels.push(`notifications:user:${userId}`);
    }

    // Tenant-wide notifications  
    if (tenantId) {
      channels.push(`notifications:tenant:${tenantId}`);
    }

    // Role-specific notifications within tenant
    if (tenantId && role) {
      channels.push(`notifications:tenant:${tenantId}:role:${role}`);
    }

    console.log('🔍 [generateChannels] Generated channels:', channels, 'for scope:', notificationScope);
    return channels;
  }

  // Publish notification to appropriate channels
  async publishNotification(
    notification: any,
    scope: {
      tenantId?: string | null;
      role?: string | null;
      userId?: string | null;
    }
  ): Promise<boolean> {
    console.log('🔍 [publishNotification] Called with:', {
      notificationId: notification.id,
      scope: scope
    });
    
    const channels = this.generatePublishChannels(scope);
    console.log('🔍 [publishNotification] Generated channels:', channels);
    
    const notificationData = {
      id: notification.id,
      title: notification.title,
      description: notification.description,
      type: notification.type,
      priority: notification.priority,
      createdAt: notification.createdAt,
      tenantId: notification.tenantId,
      role: notification.role,
      userId: notification.userId,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    };

    const publications = channels.map(channel => ({
      channel,
      data: {
        type: 'notification_created',
        notification: notificationData,
      },
    }));

    console.log("🔍 [publishNotification] Publications:", publications);
    const result = await this.publishBatch(publications);
    console.log('🔍 [publishNotification] Publish result:', result);
    return result;
  }
}

// Export singleton instance
export const centrifugoService = new CentrifugoService();
