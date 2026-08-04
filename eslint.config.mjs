import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint flat configuration.
 *
 * `eslint-config-next` 16 ships native flat configs, so they are spread in
 * directly — no `FlatCompat` bridge, which cannot serialise the modern config
 * objects anyway.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'next-env.d.ts',
      'public/sw.js',
      'src/data/**',
      'public/data/**',
    ],
  },

  ...coreWebVitals,
  ...nextTypescript,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data/search-index.json'],
              message:
                'The search index is 1.8 MB and must never reach the client bundle. Import it only from services/search.server.ts.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
