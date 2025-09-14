// Export the Prisma client instance
export { db } from "./client";

// Export the generated Prisma client and types
export { PrismaClient } from "./generated/client";
export type { Prisma } from "./generated/client";

// Export all model types from the generated client
export * from "./generated/client";

// Export outbox pattern types and repository
export * from './outbox-types';
export { OutboxRepository } from './outbox-repository';

// Export database setup functions
export * from './setup-functions';