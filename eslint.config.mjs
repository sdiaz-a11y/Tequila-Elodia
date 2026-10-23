import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'assets/**',
      '**/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Nest DI relies on runtime imports for decorator metadata.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  ...nextVitals.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    // App Router only: there is no pages/ directory to check.
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
];
