import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000, // 30 second timeout for integration tests
    setupFiles: ['./src/setup.ts'],
    sequence: {
      concurrent: false, // Run tests sequentially to avoid conflicts
    },
    pool: 'forks', // Use separate processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to avoid database conflicts
      },
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/beatthefine_test',
      NATS_URL: 'nats://localhost:4223',
    },
  },
});