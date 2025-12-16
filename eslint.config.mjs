import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript strict rules (ADR-004)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      // React rules
      'react/display-name': 'error',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Workspace isolation enforcement (ADR-008, ADR-014)
      // Prevent direct Drizzle queries outside of repositories
      // This ensures all workspace-scoped data goes through WorkspaceRepository
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'drizzle-orm',
              importNames: ['eq', 'and', 'or', 'sql', 'inArray', 'notInArray'],
              message:
                'Use WorkspaceRepository methods instead of direct Drizzle queries for workspace-scoped data. See ADR-008.',
            },
          ],
        },
      ],
    },
  },
  // Repository files - allowed to use direct Drizzle queries
  {
    files: [
      '**/repositories/**/*.ts',
      '**/server/db/**/*.ts',
      '**/lib/db/**/*.ts',
      '**/lib/auth/**/*.ts', // Auth lib needs direct access for session queries
      '**/server/trpc/routers/auth.ts', // Auth needs direct access for workspace creation
      '**/server/trpc/middleware/**/*.ts', // Middleware needs direct access for membership checks
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Storybook files
  {
    files: ['**/*.stories.ts', '**/*.stories.tsx'],
    rules: {
      // Storybook often requires default exports
      'import/no-default-export': 'off',
    },
  },
  // Test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      // Tests often have different patterns
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  // Config files
  {
    files: ['*.config.ts', '*.config.mjs', '*.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'storybook-static/**',
      'coverage/**',
      '*.config.js',
      'project-management/**', // Development assistance folder
    ],
  },
];

export default eslintConfig;
