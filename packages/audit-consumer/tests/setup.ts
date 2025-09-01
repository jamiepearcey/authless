import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/authless';
  process.env.NATS_URL = 'nats://localhost:4223';
  
  console.log('✅ Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  // Add any global cleanup here if needed
});