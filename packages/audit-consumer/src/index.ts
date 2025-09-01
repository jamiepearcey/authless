export {
  AuditConsumer,
  createAuditConsumer,
  startAuditConsumer,
  stopAuditConsumer,
} from './consumer';

export type {
  AuditConsumerConfig,
  AuditEvent,
  AuditSinkAdapter,
  AuditSinkType,
  HealthCheckResult,
} from './types';

export {
  AuditConfigLoader,
  TenantConfigResolver,
  ConfigSecurity,
} from './config';

export {
  SinkFactory,
  SinkRegistry,
  DatabaseSink,
  SplunkSink,
} from './sinks';

export {
  EventNormalizerRegistry,
  AuthEventNormalizer,
  PaymentEventNormalizer,
  SupportEventNormalizer,
  GenericEventNormalizer,
} from './normalizers/domain-normalizers';

export {
  MetricsCollector,
  HealthCheckManager,
  PrometheusMetricsExporter,
} from './metrics';

export {
  DataRedactor,
  PIIDetector,
  DEFAULT_REDACTION_RULES,
} from './utils/redaction';