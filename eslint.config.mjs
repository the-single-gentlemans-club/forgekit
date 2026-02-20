import nx from '@nx/eslint-plugin'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'react-hooks': reactHooks,
      'import': importPlugin,
    },
  },
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:async',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:async'],
            },
            {
              sourceTag: 'scope:colors',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:colors'],
            },
            {
              sourceTag: 'scope:strings',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:strings'],
            },
            {
              sourceTag: 'scope:storybook',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:storybook'],
            },
            {
              sourceTag: 'scope:figma',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:figma'],
            },
            {
              sourceTag: 'scope:context',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:storybook',
                'scope:figma',
                'scope:context',
              ],
            },
          ],
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'error',
        {
          enableDangerousAutofixThisMayCauseInfiniteLoops: true,
        },
      ],
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'no-self-compare': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.cts', '**/*.mts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000', '^\\.\\u0000'],
            ['^react', '^@?\\w'],
            ['^(@|packages|libs|lib|assets|utils|.storybook|hooks|ui|partials)(/.*|$)'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.?(css)$'],
          ],
        },
      ],
    },
  },
]
