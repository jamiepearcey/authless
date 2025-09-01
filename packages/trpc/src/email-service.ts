interface EmailNotificationData {
  notification: {
    id: string;
    title: string;
    description?: string;
    type: string;
    priority: string;
    createdAt: string;
  };
  recipient: {
    id: string;
    email: string;
    name?: string;
  };
  targetScope: {
    tenantId?: string | null;
    role?: string | null;
    userId?: string | null;
  };
}

export class EmailNotificationService {
  private webhookUrl: string | null = null;

  constructor() {
    this.webhookUrl = process.env.SEND_NOTIFICATION_WEBHOOK_URL || null;
  }

  async sendNotificationEmail(data: EmailNotificationData): Promise<boolean> {
    if (!this.webhookUrl) {
      console.log('📧 No email webhook URL configured, skipping email notification');
      return false;
    }

    try {
      console.log('📧 Sending email notification via webhook:', {
        notificationId: data.notification.id,
        recipientEmail: data.recipient.email,
        webhookUrl: this.webhookUrl,
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'authless-NotificationSystem/1.0',
        },
        body: JSON.stringify({
          event: 'notification.email',
          timestamp: new Date().toISOString(),
          data: {
            notification: data.notification,
            recipient: data.recipient,
            targetScope: data.targetScope,
          },
        }),
      });

      if (!response.ok) {
        console.error('📧 Email webhook failed:', {
          status: response.status,
          statusText: response.statusText,
          notificationId: data.notification.id,
        });
        return false;
      }

      const result = await response.json();
      console.log('📧 Email notification sent successfully:', {
        notificationId: data.notification.id,
        recipientEmail: data.recipient.email,
        webhookResponse: result,
      });

      return true;
    } catch (error) {
      console.error('📧 Error sending email notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: data.notification.id,
        recipientEmail: data.recipient.email,
      });
      return false;
    }
  }

  async sendBulkNotificationEmails(notifications: EmailNotificationData[]): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    if (!this.webhookUrl) {
      console.log('📧 No email webhook URL configured, skipping bulk email notifications');
      return { success: 0, failed: 0, total: notifications.length };
    }

    console.log(`📧 Sending ${notifications.length} email notifications via webhook`);

    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotificationEmail(notification))
    );

    const success = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - success;

    console.log('📧 Bulk email notification results:', {
      total: notifications.length,
      success,
      failed,
    });

    return { success, failed, total: notifications.length };
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  getWebhookUrl(): string | null {
    return this.webhookUrl;
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();
