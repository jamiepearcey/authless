import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up audit-service test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NATS_URL = 'nats://localhost:4223';
  
  console.log('✅ Audit-service test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up audit-service test environment...');
});