export { OutboxProcessor } from './processor';
export { setupOutboxDatabase } from './setup-database';

export interface ProcessorConfig {
  databaseUrl: string;
  natsUrl: string;
  batchSize?: number;
  maxTries?: number;
  idleSleepMs?: number;
}