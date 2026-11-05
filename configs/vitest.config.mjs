import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';

import viteConfig from './vite.config.mjs';

export default defineConfig({
  root: viteConfig.root,
  envDir: false,
  resolve: viteConfig.resolve,
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    fileParallelism: true,
    maxWorkers: Math.min(3, availableParallelism()),
    isolate: true,
    sequence: { concurrent: false },
    pool: 'forks',
    testTimeout: 60000,
    hookTimeout: 60000,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true
  }
});
