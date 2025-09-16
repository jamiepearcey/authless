import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealtimeService } from './index';
import { NotificationService } from './notification-service';

// Mock dependencies
const mockJetStreamServiceWrapper = {
  start: vi.fn(),
  stop: vi.fn(),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
};

const mockChannelRouter = {
  route: vi.fn(),
};

const mockNotificationService = {
  processNotificationIntent: vi.fn(),
  processDomainEvent: vi.fn(),
  processNotificationCreated: vi.fn(),
  disconnect: vi.fn(),
};

// Mock the JetStreamServiceWrapper import
vi.mock('@jetstream/service-wrapper', () => ({
  JetStreamServiceWrapper: vi.fn(() => mockJetStreamServiceWrapper),
}));

// Mock the ChannelRouter import
vi.mock('@jetstream/realtime-consumer', () => ({
  ChannelRouter: vi.fn(() => mockChannelRouter),
}));

// Mock the NotificationService
vi.mock('./notification-service', () => ({
  NotificationService: vi.fn(() => mockNotificationService),
}));

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      serviceName: 'test-realtime-service',
      version: '1.0.0',
      natsUrl: 'nats://127.0.0.1:4222',
      streamName: 'EVENTS',
      centrifugoUrl: 'http://localhost:8000',
      centrifugoApiKey: 'test-key',
      databaseUrl: 'postgresql://test',
      channels: {
        'notification.intent.*': { handler: 'handleNotificationIntent' },
        'events.*': { handler: 'handleDomainEvent' },
        'notification.created': { handler: 'handleNotificationCreated' },
      },
      notificationConfig: {
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
      },
    };

    realtimeService = new RealtimeService(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(realtimeService).toBeDefined();
      expect(mockJetStreamServiceWrapper).toBeDefined();
      expect(mockChannelRouter).toBeDefined();
      expect(mockNotificationService).toBeDefined();
    });
  });

  describe('handleNotificationIntent', () => {
    it('should process notification intents', async () => {
      const intent = {
        id: 'intent-1',
        tenantId: 'tenant-1',
        type: 'support.reply.created',
        recipients: ['user-1'],
        payloadJson: { message: 'Test notification' },
      };

      const ctx = {
        messageId: 'msg-1',
        subject: 'notification.intent.created',
        timestamp: new Date(),
      };

      mockNotificationService.processNotificationIntent.mockResolvedValue(undefined);

      await realtimeService.handleNotificationIntent(intent, ctx);

      expect(mockNotificationService.processNotificationIntent).toHaveBeenCalledWith(intent);
    });

    it('should handle processing errors', async () => {
      const intent = {
        id: 'intent-1',
        tenantId: 'tenant-1',
        type: 'support.reply.created',
        recipients: ['user-1'],
        payloadJson: { message: 'Test notification' },
      };

      const ctx = {
        messageId: 'msg-1',
        subject: 'notification.intent.created',
        timestamp: new Date(),
      };

      const error = new Error('Processing failed');
      mockNotificationService.processNotificationIntent.mockRejectedValue(error);

      await expect(realtimeService.handleNotificationIntent(intent, ctx)).rejects.toThrow('Processing failed');
    });
  });

  describe('handleDomainEvent', () => {
    it('should process domain events', async () => {
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

      const ctx = {
        messageId: 'msg-1',
        subject: 'events.support.reply.created',
        timestamp: new Date(),
      };

      mockNotificationService.processDomainEvent.mockResolvedValue(undefined);

      await realtimeService.handleDomainEvent(event, ctx);

      expect(mockNotificationService.processDomainEvent).toHaveBeenCalledWith(event, 'support.reply.created');
    });

    it('should handle processing errors', async () => {
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

      const ctx = {
        messageId: 'msg-1',
        subject: 'events.support.reply.created',
        timestamp: new Date(),
      };

      const error = new Error('Processing failed');
      mockNotificationService.processDomainEvent.mockRejectedValue(error);

      await expect(realtimeService.handleDomainEvent(event, ctx)).rejects.toThrow('Processing failed');
    });
  });

  describe('handleNotificationCreated', () => {
    it('should process notification created events', async () => {
      const notificationData = {
        id: 'notification-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        title: 'Test Notification',
        description: 'Test description',
        type: 'support.reply.created',
      };

      const ctx = {
        messageId: 'msg-1',
        subject: 'notification.created',
        timestamp: new Date(),
      };

      mockNotificationService.processNotificationCreated.mockResolvedValue(undefined);

      await realtimeService.handleNotificationCreated(notificationData, ctx);

      expect(mockNotificationService.processNotificationCreated).toHaveBeenCalledWith(notificationData);
    });

    it('should handle processing errors', async () => {
      const notificationData = {
        id: 'notification-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        title: 'Test Notification',
        description: 'Test description',
        type: 'support.reply.created',
      };

      const ctx = {
        messageId: 'msg-1',
        subject: 'notification.created',
        timestamp: new Date(),
      };

      const error = new Error('Processing failed');
      mockNotificationService.processNotificationCreated.mockRejectedValue(error);

      await expect(realtimeService.handleNotificationCreated(notificationData, ctx)).rejects.toThrow('Processing failed');
    });
  });

  describe('start', () => {
    it('should start the service', async () => {
      mockJetStreamServiceWrapper.start.mockResolvedValue(undefined);

      await realtimeService.start();

      expect(mockJetStreamServiceWrapper.start).toHaveBeenCalled();
    });

    it('should handle start errors', async () => {
      const error = new Error('Start failed');
      mockJetStreamServiceWrapper.start.mockRejectedValue(error);

      await expect(realtimeService.start()).rejects.toThrow('Start failed');
    });
  });

  describe('stop', () => {
    it('should stop the service', async () => {
      mockJetStreamServiceWrapper.stop.mockResolvedValue(undefined);
      mockNotificationService.disconnect.mockResolvedValue(undefined);

      await realtimeService.stop();

      expect(mockJetStreamServiceWrapper.stop).toHaveBeenCalled();
      expect(mockNotificationService.disconnect).toHaveBeenCalled();
    });

    it('should handle stop errors', async () => {
      const error = new Error('Stop failed');
      mockJetStreamServiceWrapper.stop.mockRejectedValue(error);

      await expect(realtimeService.stop()).rejects.toThrow('Stop failed');
    });
  });
});
