import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupportNotificationService } from './support-notification-service';
import { PrismaClient } from '@db/base';

// Mock Prisma Client
const mockPrisma = {
  supportCase: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  membership: {
    findMany: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  notificationRecipient: {
    create: vi.fn(),
  },
  supportConfiguration: {
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} as any;

// Mock Outbox Service
const mockOutbox = {
  publishNotificationEvent: vi.fn(),
} as any;

// Mock Email Service
const mockEmailService = {
  sendNotificationEmail: vi.fn(),
} as any;

// Mock the email service import
vi.mock('./email-service', () => ({
  emailNotificationService: mockEmailService,
}));

describe('SupportNotificationService', () => {
  let supportNotificationService: SupportNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    supportNotificationService = new SupportNotificationService(mockPrisma, mockOutbox);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSupportNotification', () => {
    it('should create notification for assignee', async () => {
      const input = {
        type: 'CASE_ASSIGNED' as const,
        caseId: 'case-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        priority: 'normal' as const,
        visibility: 'BOTH' as const,
        recipientType: 'ASSIGNEE' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const supportCase = {
        id: 'case-1',
        caseNumber: 'CSC-001',
        assigneeId: 'assignee-1',
        assignee: {
          id: 'assignee-1',
          email: 'assignee@test.com',
          name: 'Assignee User',
        },
        contactMessage: {
          userId: 'customer-1',
        },
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
        },
      };

      const user = {
        id: 'assignee-1',
        notifySupportRepliesUI: true,
        notifySupportRepliesEmail: true,
        emailNotifications: true,
      };

      const notification = {
        id: 'notification-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        type: 'support',
        priority: 'normal',
        status: 'unread',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      // Mock database calls
      mockPrisma.supportCase.findUnique.mockResolvedValue(supportCase);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notificationRecipient.create.mockResolvedValue({});
      mockOutbox.publishNotificationEvent.mockResolvedValue('event-1');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await supportNotificationService.createSupportNotification(input);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notification-1');
      expect(result.recipientCount).toBe(1);
      expect(result.uiNotificationsSent).toBe(1);
      expect(result.emailNotificationsSent).toBe(0); // No email sent for UI+EMAIL with email disabled

      // Verify notification creation
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Case Assigned',
          description: 'A case has been assigned to you',
          type: 'support',
          priority: 'normal',
          status: 'unread',
          tenantId: 'tenant-1',
        }),
      });

      // Verify outbox event publishing
      expect(mockOutbox.publishNotificationEvent).toHaveBeenCalledWith(
        expect.any(String), // EventType
        'notification-1',
        'tenant-1',
        expect.objectContaining({
          notificationId: 'notification-1',
          tenantId: 'tenant-1',
          userId: 'assignee-1',
          title: 'Case Assigned',
          description: 'A case has been assigned to you',
          type: 'support',
          priority: 'normal',
        }),
        expect.objectContaining({
          traceId: 'user-1',
          idempotencyKey: expect.stringContaining('support-notification'),
        })
      );
    });

    it('should create notification for customer', async () => {
      const input = {
        type: 'CASE_MESSAGE_RECEIVED' as const,
        caseId: 'case-1',
        title: 'New Message Received',
        description: 'You have received a new message',
        priority: 'normal' as const,
        visibility: 'BOTH' as const,
        recipientType: 'CUSTOMER' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const supportCase = {
        id: 'case-1',
        caseNumber: 'CSC-001',
        assigneeId: null,
        assignee: null,
        contactMessage: {
          userId: 'customer-1',
        },
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
        },
      };

      const customer = {
        id: 'customer-1',
        email: 'customer@test.com',
        name: 'Customer User',
      };

      const user = {
        id: 'customer-1',
        notifySupportRepliesUI: true,
        notifySupportRepliesEmail: true,
        emailNotifications: true,
      };

      const notification = {
        id: 'notification-1',
        title: 'New Message Received',
        description: 'You have received a new message',
        type: 'support',
        priority: 'normal',
        status: 'unread',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      // Mock database calls
      mockPrisma.supportCase.findUnique.mockResolvedValue(supportCase);
      mockPrisma.user.findUnique.mockResolvedValueOnce(customer);
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notificationRecipient.create.mockResolvedValue({});
      mockOutbox.publishNotificationEvent.mockResolvedValue('event-1');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await supportNotificationService.createSupportNotification(input);

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(1);
      expect(result.recipients[0].userId).toBe('customer-1');
    });

    it('should create notification for role-based recipients', async () => {
      const input = {
        type: 'CASE_CREATED' as const,
        caseId: 'case-1',
        title: 'New Case Created',
        description: 'A new case has been created',
        priority: 'normal' as const,
        visibility: 'BOTH' as const,
        recipientType: 'ROLE' as const,
        recipients: ['admin', 'support'],
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const supportCase = {
        id: 'case-1',
        caseNumber: 'CSC-001',
        assigneeId: null,
        assignee: null,
        contactMessage: null,
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
        },
      };

      const roleMembers = [
        {
          userId: 'admin-1',
          role: 'admin',
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin User',
          },
        },
        {
          userId: 'support-1',
          role: 'support',
          user: {
            id: 'support-1',
            email: 'support@test.com',
            name: 'Support User',
          },
        },
      ];

      const users = [
        {
          id: 'admin-1',
          notifySupportRepliesUI: true,
          notifySupportRepliesEmail: true,
          emailNotifications: true,
        },
        {
          id: 'support-1',
          notifySupportRepliesUI: true,
          notifySupportRepliesEmail: true,
          emailNotifications: true,
        },
      ];

      const notification = {
        id: 'notification-1',
        title: 'New Case Created',
        description: 'A new case has been created',
        type: 'support',
        priority: 'normal',
        status: 'unread',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      // Mock database calls
      mockPrisma.supportCase.findUnique.mockResolvedValue(supportCase);
      mockPrisma.membership.findMany.mockResolvedValue(roleMembers);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(users[0])
        .mockResolvedValueOnce(users[1]);
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notificationRecipient.create.mockResolvedValue({});
      mockOutbox.publishNotificationEvent.mockResolvedValue('event-1');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await supportNotificationService.createSupportNotification(input);

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(2);
      expect(result.recipients).toHaveLength(2);

      // Verify role-based user lookup
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          role: { in: ['admin', 'support'] },
          status: 'active',
        },
        include: {
          user: true,
        },
      });
    });

    it('should handle case not found', async () => {
      const input = {
        type: 'CASE_ASSIGNED' as const,
        caseId: 'nonexistent-case',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      mockPrisma.supportCase.findUnique.mockResolvedValue(null);

      await expect(supportNotificationService.createSupportNotification(input))
        .rejects.toThrow('Support case not found');
    });

    it('should handle no valid recipients', async () => {
      const input = {
        type: 'CASE_ASSIGNED' as const,
        caseId: 'case-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        recipientType: 'ASSIGNEE' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const supportCase = {
        id: 'case-1',
        caseNumber: 'CSC-001',
        assigneeId: null,
        assignee: null,
        contactMessage: null,
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
        },
      };

      const notification = {
        id: 'notification-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        type: 'support',
        priority: 'normal',
        status: 'unread',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      mockPrisma.supportCase.findUnique.mockResolvedValue(supportCase);
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await supportNotificationService.createSupportNotification(input);

      expect(result.success).toBe(true);
      expect(result.message).toBe('No valid recipients found');
      expect(result.recipientCount).toBe(0);
      expect(result.uiNotificationsSent).toBe(0);
      expect(result.emailNotificationsSent).toBe(0);
    });

    it('should handle email fallback policy', async () => {
      const input = {
        type: 'CASE_ASSIGNED' as const,
        caseId: 'case-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        priority: 'normal' as const,
        visibility: 'EMAIL' as const,
        recipientType: 'ASSIGNEE' as const,
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const supportCase = {
        id: 'case-1',
        caseNumber: 'CSC-001',
        assigneeId: 'assignee-1',
        assignee: {
          id: 'assignee-1',
          email: 'assignee@test.com',
          name: 'Assignee User',
        },
        contactMessage: null,
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
        },
      };

      const user = {
        id: 'assignee-1',
        notifySupportRepliesUI: true,
        notifySupportRepliesEmail: false, // Email disabled
        emailNotifications: false,
      };

      const fallbackPolicy = {
        id: 'config-1',
        key: 'emailOnlyFallbackToUI',
        value: true,
      };

      const notification = {
        id: 'notification-1',
        title: 'Case Assigned',
        description: 'A case has been assigned to you',
        type: 'support',
        priority: 'normal',
        status: 'unread',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      // Mock database calls
      mockPrisma.supportCase.findUnique.mockResolvedValue(supportCase);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.supportConfiguration.findFirst
        .mockResolvedValueOnce(fallbackPolicy) // Tenant-specific policy
        .mockResolvedValueOnce(null); // Global policy
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notificationRecipient.create.mockResolvedValue({});
      mockOutbox.publishNotificationEvent.mockResolvedValue('event-1');
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await supportNotificationService.createSupportNotification(input);

      expect(result.success).toBe(true);
      expect(result.uiNotificationsSent).toBe(1); // Fallback to UI
      expect(result.emailNotificationsSent).toBe(0);

      // Verify fallback audit log
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'support_notification_fallback_to_ui',
          details: expect.stringContaining('Email notifications disabled'),
        }),
      });
    });
  });
});
