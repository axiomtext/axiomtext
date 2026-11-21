// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'packages/flutter/**',
      'playwright-report/**',
      'test-results/**',
      '**/.astro/**',
      'apps/website/public/playground/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Security: no dynamic code execution anywhere in the editor.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      // Quality
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['scripts/**', '**/scripts/**', 'benchmarks/**', '**/*.config.{js,ts,mjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
  {
    // Code passed to page.evaluate() runs in the browser.
    files: ['benchmarks/**'],
    languageOptions: {
      globals: {
        window: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        queueMicrotask: 'readonly',
      },
    },
  },
  {
    // Allow `_name` for values deliberately left unused (destructuring them out, typed emits).
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Tests intentionally contain malicious payloads (javascript: URLs etc.).
    files: ['**/tests/**', 'e2e/**'],
    rules: { 'no-script-url': 'off' },
  },
  prettier,
);
