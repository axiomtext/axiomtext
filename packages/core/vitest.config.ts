import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // M1 gate: core coverage ≥ 90 %.
    coverage: {
      include: ['src/**'],
      reporter: ['text-summary'],
      thresholds: { statements: 90, lines: 90, functions: 90 },
    },
  },
});
