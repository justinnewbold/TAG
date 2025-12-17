import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially to avoid database locks
    sequence: {
      concurrent: false,
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Use test database
    env: {
      DATABASE_PATH: ':memory:',
      NODE_ENV: 'test',
    },
  },
});
