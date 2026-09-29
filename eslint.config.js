import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'test-results', '.impeccable', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.config.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        document: 'readonly',
        window: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        Worker: 'readonly',
        MessageEvent: 'readonly',
        DedicatedWorkerGlobalScope: 'readonly',
        Transferable: 'readonly',
        requestAnimationFrame: 'readonly',
        structuredClone: 'readonly',
        self: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
);
