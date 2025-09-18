/**
 * Simplified, purely config-driven notification mapping
 * All notification logic is defined declaratively in this configuration
 */

export interface NotificationRule {
  // Event matching
  eventPattern: string; // e.g., "invitation.created", "payment.*", etc.
  
  // Notification configuration
  notificationType: string;
  templateId?: string; // Optional until all templates are created
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Recipient resolution strategy
  recipientStrategy: {
    type: 'direct' | 'role' | 'tenant' | 'global' | 'custom';
    // For 'direct': extract from specific payload fields
    fields?: string[];
    // For 'role': target users with specific roles
    roles?: string[];
    // For 'tenant': all active members of tenant
    // For 'global': all active users across all tenants (for system-wide notifications)
    // For 'custom': use custom function
    resolver?: (event: any) => Promise<string[]>;
  };
  
  // Channels to deliver to
  channels: ('email' | 'web' | 'sms' | 'push')[];
  
  // Optional conditions
  conditions?: {
    // Simple field-based conditions
    field?: string;
    operator?: 'equals' | 'not_equals' | 'exists' | 'not_exists';
    value?: any;
    // Or custom condition function
    custom?: (event: any) => boolean;
  }[];
  
  // Template variable mapping
  templateVariables?: {
    [templateVar: string]: string; // Maps template variable to event payload path
  };
}

export const notificationRules: NotificationRule[] = [
  // ============================================================================
  // INVITATION NOTIFICATIONS
  // ============================================================================
  {
    eventPattern: 'invitation.created',
    notificationType: 'invitation_created',
    templateId: 'invitation_created_template',
    priority: 'high',
    recipientStrategy: {
      type: 'direct',
      fields: ['invitedUserId'] // Use the user ID we now create upfront
    },
    channels: ['email', 'web'],
    conditions: [
      {
        field: 'bypassEmailVerification',
        operator: 'not_equals',
        value: true
      }
    ],
    templateVariables: {
      email: 'email',
      role: 'role',
      tenantSlug: 'tenantSlug',
      invitedByEmail: 'invitedByEmail',
      inviteUrl: 'inviteUrl',
      message: 'message',
      expiresAt: 'expiresAt'
    }
  },
  
  {
    eventPattern: 'invitation.accepted',
    notificationType: 'invitation_accepted',
    templateId: 'invitation_accepted_template',
    priority: 'normal',
    recipientStrategy: {
      type: 'direct',
      fields: ['invitedByUserId'] // Notify the person who sent the invitation
    },
    channels: ['email', 'web'],
    templateVariables: {
      acceptedUserEmail: 'email',
      tenantSlug: 'tenantSlug',
      role: 'role'
    }
  },
  
  // ============================================================================
  // SUPPORT NOTIFICATIONS
  // ============================================================================
  {
    eventPattern: 'support.reply.created',
    notificationType: 'support_reply',
    // templateId: 'support_reply_template', // Template not yet created
    priority: 'normal',
    recipientStrategy: {
      type: 'direct',
      fields: ['caseCreatorId']
    },
    channels: ['email', 'web'],
    conditions: [
      {
        // Don't notify if the reply is from the case creator themselves
        custom: (event) => event.payload?.createdBy !== event.payload?.caseCreatorId
      }
    ],
    templateVariables: {
      caseNumber: 'caseNumber',
      caseTitle: 'title',
      replyMessage: 'message',
      repliedBy: 'createdByName'
    }
  },
  
  {
    eventPattern: 'support.ticket.assigned',
    notificationType: 'case_assigned',
    // templateId: 'case_assigned_template', // Template not yet created
    priority: 'normal',
    recipientStrategy: {
      type: 'direct',
      fields: ['assignedTo']
    },
    channels: ['email', 'web'],
    templateVariables: {
      caseNumber: 'caseNumber',
      caseTitle: 'title',
      priority: 'priority',
      assignedBy: 'assignedByName'
    }
  },
  
  // ============================================================================
  // PAYMENT NOTIFICATIONS
  // ============================================================================
  {
    eventPattern: 'payment.failed',
    notificationType: 'payment_failed',
    // templateId: 'payment_failed_template', // Template not yet created
    priority: 'high',
    recipientStrategy: {
      type: 'role',
      roles: ['admin', 'billing'] // Notify admins and billing users
    },
    channels: ['email', 'web'],
    templateVariables: {
      amount: 'amount',
      currency: 'currency',
      customerEmail: 'customerEmail',
      failureReason: 'failureReason'
    }
  },
  
  // ============================================================================
  // TENANT NOTIFICATIONS
  // ============================================================================
  {
    eventPattern: 'tenant.member.removed',
    notificationType: 'member_removed',
    // templateId: 'member_removed_template', // Template not yet created
    priority: 'normal',
    recipientStrategy: {
      type: 'role',
      roles: ['admin'] // Notify tenant admins
    },
    channels: ['email', 'web'],
    templateVariables: {
      removedUserEmail: 'removedUserEmail',
      removedByEmail: 'removedByEmail',
      tenantSlug: 'tenantSlug',
      role: 'role'
    }
  },
  
  // ============================================================================
  // SYSTEM NOTIFICATIONS
  // ============================================================================
  {
    eventPattern: 'system.maintenance',
    notificationType: 'maintenance_notification',
    templateId: 'maintenance_template',
    priority: 'urgent',
    recipientStrategy: {
      type: 'global' // All active users across all tenants for system-wide maintenance
    },
    channels: ['email', 'web'],
    templateVariables: {
      maintenanceStart: 'startTime',
      maintenanceEnd: 'endTime',
      description: 'description'
    }
  }
];

export default notificationRules;