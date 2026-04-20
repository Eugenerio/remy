import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
    setupFiles: ['./test/setup.ts'],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@remy/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      '@remy/shared/errors': new URL('../../packages/shared/src/errors.ts', import.meta.url).pathname,
      '@remy/shared/credits': new URL('../../packages/shared/src/credits.ts', import.meta.url).pathname,
      '@remy/shared/jobs': new URL('../../packages/shared/src/jobs.ts', import.meta.url).pathname,
      '@remy/shared/prompts': new URL('../../packages/shared/src/prompts.ts', import.meta.url).pathname,
      '@remy/shared/schemas': new URL('../../packages/shared/src/schemas.ts', import.meta.url).pathname,
    },
  },
});
