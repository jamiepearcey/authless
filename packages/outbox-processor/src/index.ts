export { OutboxProcessor } from './processor';
export { setupOutboxDatabase } from './setup-database';

export interface ProcessorConfig {
  databaseUrl: string;
  natsUrl: string;
  batchSize?: number;
  maxTries?: number;
  idleSleepMs?: number;
  logger?: {
    info: (obj: any, msg?: string) => void;
    error: (obj: any, msg?: string) => void;
    warn: (obj: any, msg?: string) => void;
    debug: (obj: any, msg?: string) => void;
  };
}