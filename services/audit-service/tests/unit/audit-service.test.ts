import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  AuditService,
  createAuditService,
  loadAuditServiceConfig,
  initializeAuditService 
} from '../../src/index';

// Mock NATS
vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    jetstream: vi.fn().mockReturnValue({
      streams: {
        info: vi.fn().mockResolvedValue({ config: { name: 'events' } })
      },
      publish: vi.fn().mockResolvedValue(undefined)
    }),
    close: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false)
  })
}));

describe('Audit Service Unit Tests', () => {
  let auditService: AuditService;

  const testConfig = {
    natsUrl: 'nats://localhost:4223',
    streamName: 'events',
    defaultTenantId: 'test-tenant',
    defaultService: 'test-service',
    defaultVersion: '1.0.0',
    maxRetries: 3,
    retryDelayMs: 100,
  };

  beforeEach(() => {
    auditService = createAuditService(testConfig);
  });

  afterEach(async () => {
    await auditService?.close();
  });

  it('should create audit service with config', () => {
    expect(auditService).toBeInstanceOf(AuditService);
  });

  it('should initialize successfully', async () => {
    await expect(auditService.initialize()).resolves.not.toThrow();
  });

  it('should audit user login events', async () => {
    await auditService.initialize();

    await expect(auditService.auditUserLogin(
      {
        tenantId: 'test-tenant',
        userId: 'user-123',
        requestId: 'req-123',
        ipAddress: '127.0.0.1'
      },
      {
        type: 'user',
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        ipAddress: '127.0.0.1'
      },
      'success'
    )).resolves.not.toThrow();
  });

  it('should audit payment events', async () => {
    await auditService.initialize();

    await expect(auditService.auditPaymentCompleted(
      { tenantId: 'test-tenant', userId: 'user-123' },
      { type: 'user', id: 'user-123', name: 'Test User' },
      'payment-456',
      1000,
      'GBP'
    )).resolves.not.toThrow();
  });

  it('should audit subscription events', async () => {
    await auditService.initialize();

    await expect(auditService.auditSubscriptionCreated(
      { tenantId: 'test-tenant', userId: 'user-123' },
      { type: 'user', id: 'user-123', name: 'Test User' },
      'sub-789',
      'premium-plan'
    )).resolves.not.toThrow();
  });

  it('should audit support ticket events', async () => {
    await auditService.initialize();

    await expect(auditService.auditSupportTicketCreated(
      { tenantId: 'test-tenant', userId: 'user-123' },
      { type: 'user', id: 'user-123', name: 'Test User' },
      'ticket-101',
      'Payment Issue',
      'high'
    )).resolves.not.toThrow();
  });

  it('should audit custom events', async () => {
    await auditService.initialize();

    await expect(auditService.auditCustomEvent(
      'custom',
      'custom_event',
      { tenantId: 'test-tenant', userId: 'user-123' },
      { type: 'user', id: 'user-123', name: 'Test User' },
      { type: 'resource', id: 'resource-123' },
      { type: 'action', description: 'Custom action', outcome: 'success' }
    )).resolves.not.toThrow();
  });

  it('should load configuration from environment', () => {
    process.env.NATS_URL = 'nats://test:4222';
    process.env.AUDIT_STREAM_NAME = 'test-stream';
    process.env.SERVICE_NAME = 'test-service';
    
    const config = loadAuditServiceConfig();
    
    expect(config.natsUrl).toBe('nats://test:4222');
    expect(config.streamName).toBe('test-stream');
    expect(config.defaultService).toBe('test-service');
  });

  it('should use default values when environment vars not set', () => {
    delete process.env.NATS_URL;
    delete process.env.AUDIT_STREAM_NAME;
    delete process.env.SERVICE_NAME;
    
    const config = loadAuditServiceConfig();
    
    expect(config.natsUrl).toBe('nats://localhost:4223');
    expect(config.streamName).toBe('events');
    expect(config.defaultService).toBe('unknown-service');
  });

  it('should initialize service from environment config', async () => {
    const service = await initializeAuditService({
      defaultService: 'test-override'
    });
    
    expect(service).toBeInstanceOf(AuditService);
    await service.close();
  });

  it('should handle initialization errors gracefully', async () => {
    // Create service with invalid config to trigger error
    const invalidService = createAuditService({
      ...testConfig,
      natsUrl: 'invalid://url'
    });

    // Mock connect to throw an error
    const { connect } = await import('nats');
    vi.mocked(connect).mockRejectedValueOnce(new Error('Connection failed'));

    await expect(invalidService.initialize()).rejects.toThrow('Connection failed');
  });

  it('should close connection properly', async () => {
    await auditService.initialize();
    await expect(auditService.close()).resolves.not.toThrow();
  });

  it('should prevent publishing before initialization', async () => {
    await expect(auditService.auditUserLogin(
      { tenantId: 'test-tenant', userId: 'user-123' },
      { type: 'user', id: 'user-123', name: 'Test User' },
      'success'
    )).rejects.toThrow('Audit service not initialized');
  });
});