import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from './notification-service';
import type { PrismaClient } from '@db/base';
import { CentrifugoClient } from '@jetstream/realtime-consumer';

// Mock Prisma Client
const mockPrisma = {
  notificationIntent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  notificationDelivery: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  notificationPreferences: {
    findUnique: vi.fn(),
  },
  membership: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
} as any;

// Mock Centrifugo Client
const mockCentrifugoClient = {
  publishNotification: vi.fn(),
} as any;

// Mock Logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      databaseUrl: 'postgresql://test',
      centrifugoUrl: 'http://test',
      centrifugoApiKey: 'test-key',
      eventMappings: {
        'support.reply.created': {
          templateId: 'support_reply_template',
          channels: ['realtime', 'email'],
        },
      },
      defaultPreferences: {
        channels: { web: true, email: true, mobile: false, desktop: false },
        categories: {},
      },
      templateProcessing: true,
      deliveryRetryConfig: {
        maxTries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      },
    };

    notificationService = new NotificationService(config, mockLogger);
    // Replace the internal prisma and centrifugo clients with mocks
    (notificationService as any).prisma = mockPrisma;
    (notificationService as any).centrifugoClient = mockCentrifugoClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processNotificationIntent', () => {
    it('should process a notification intent successfully', async () => {
      const intent = {
        id: 'intent-1',
        tenantId: 'tenant-1',
        type: 'support.reply.created',
        recipients: ['user-1', 'user-2'],
        payloadJson: { message: 'Test notification' },
        idempotencyKey: 'test-key',
      };

      // Mock idempotency check - no existing intent
      mockPrisma.notificationIntent.findUnique.mockResolvedValue(null);

      // Mock user lookup
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@test.com', name: 'User 1' },
        { id: 'user-2', email: 'user2@test.com', name: 'User 2' },
      ]);

      // Mock notification creation
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-1',
        title: 'Support Reply Created',
        description: 'A support reply has been created',
        type: 'support.reply.created',
        tenantId: 'tenant-1',
        userId: 'user-1',
      });

      // Mock delivery record creation
      mockPrisma.notificationDelivery.create.mockResolvedValue({});

      // Mock Centrifugo publish
      mockCentrifugoClient.publishNotification.mockResolvedValue(true);

      // Mock intent status update
      mockPrisma.notificationIntent.update.mockResolvedValue({});

      await notificationService.processNotificationIntent(intent);

      // Verify idempotency check
      expect(mockPrisma.notificationIntent.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'test-key' },
        select: { id: true },
      });

      // Verify notification creation for each user
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

      // Verify Centrifugo publish for each user
      expect(mockCentrifugoClient.publishNotification).toHaveBeenCalledTimes(2);

      // Verify intent status update
      expect(mockPrisma.notificationIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-1' },
        data: {
          status: 'completed',
          errorMessage: null,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should skip processing if intent already exists (idempotency)', async () => {
      const intent = {
        id: 'intent-1',
        tenantId: 'tenant-1',
        type: 'support.reply.created',
        recipients: ['user-1'],
        payloadJson: { message: 'Test notification' },
        idempotencyKey: 'test-key',
      };

      // Mock idempotency check - existing intent found
      mockPrisma.notificationIntent.findUnique.mockResolvedValue({ id: 'existing-intent' });

      await notificationService.processNotificationIntent(intent);

      // Verify idempotency check
      expect(mockPrisma.notificationIntent.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'test-key' },
        select: { id: true },
      });

      // Verify no further processing
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(mockCentrifugoClient.publishNotification).not.toHaveBeenCalled();
    });

    it('should handle role-based recipients', async () => {
      const intent = {
        id: 'intent-1',
        tenantId: 'tenant-1',
        type: 'support.reply.created',
        recipients: { type: 'role', ids: ['admin', 'support'] },
        payloadJson: { message: 'Test notification' },
      };

      // Mock idempotency check
      mockPrisma.notificationIntent.findUnique.mockResolvedValue(null);

      // Mock role-based user lookup
      mockPrisma.membership.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      // Mock user details
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@test.com', name: 'User 1' },
        { id: 'user-2', email: 'user2@test.com', name: 'User 2' },
      ]);

      // Mock other operations
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.notificationDelivery.create.mockResolvedValue({});
      mockCentrifugoClient.publishNotification.mockResolvedValue(true);
      mockPrisma.notificationIntent.update.mockResolvedValue({});

      await notificationService.processNotificationIntent(intent);

      // Verify role-based user lookup
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          role: { in: ['admin', 'support'] },
          status: 'active',
        },
        select: { userId: true },
        distinct: ['userId'],
      });
    });
  });

  describe('processDomainEvent', () => {
    it('should process domain events and create notifications', async () => {
      const event = {
        id: 'event-1',
        tenantId: 'tenant-1',
        eventName: 'support.reply.created',
        payload: { 
          userId: 'user-1',
          caseId: 'case-1',
          message: 'Test reply',
        },
        timestamp: new Date().toISOString(),
      };

      // Mock event mapping
      const eventMappings = {
        'support.reply.created': {
          templateId: 'support_reply_template',
          channels: ['realtime', 'email'],
        },
      };

      // Mock user lookup
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@test.com', name: 'User 1' },
      ]);

      // Mock notification creation
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-1',
        title: 'Support Reply Created',
        description: 'A support reply has been created',
        type: 'support.reply.created',
        tenantId: 'tenant-1',
        userId: 'user-1',
      });

      // Mock other operations
      mockPrisma.notificationDelivery.create.mockResolvedValue({});
      mockCentrifugoClient.publishNotification.mockResolvedValue(true);

      await notificationService.processDomainEvent(event, 'support.reply.created');

      // Verify notification creation
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          type: 'support.reply.created',
          title: expect.any(String),
          description: expect.any(String),
        }),
      });
    });
  });

  describe('processNotificationCreated', () => {
    it('should process notification created events', async () => {
      const notificationData = {
        id: 'notification-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        title: 'Test Notification',
        description: 'Test description',
        type: 'support.reply.created',
      };

      // Mock notification lookup
      mockPrisma.notification.findUnique.mockResolvedValue(notificationData);

      // Mock Centrifugo publish
      mockCentrifugoClient.publishNotification.mockResolvedValue(true);

      await notificationService.processNotificationCreated(notificationData);

      // Verify Centrifugo publish
      expect(mockCentrifugoClient.publishNotification).toHaveBeenCalledWith(
        notificationData,
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          role: undefined,
        }
      );
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user preferences when found', async () => {
      const mockPreferences = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        realtimeEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
      };

      mockPrisma.notificationPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await notificationService.getUserNotificationPreferences('user-1', 'tenant-1', 'support.reply.created');

      expect(result).toEqual({
        userId: 'user-1',
        tenantId: 'tenant-1',
        channels: {
          web: true,
          email: true,
          mobile: false,
          desktop: false,
        },
        categories: {},
      });
    });

    it('should return default preferences when user preferences not found', async () => {
      mockPrisma.notificationPreferences.findUnique.mockResolvedValue(null);

      const result = await notificationService.getUserNotificationPreferences('user-1', 'tenant-1', 'support.reply.created');

      expect(result).toEqual({
        userId: 'user-1',
        tenantId: 'tenant-1',
        channels: {
          web: true,
          email: true,
          mobile: false,
          desktop: false,
        },
        categories: {},
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      await notificationService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
