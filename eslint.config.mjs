import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibraryPlugin from 'eslint-plugin-testing-library';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'testing-library': testingLibraryPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
    },
  },
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cts', '**/*.mts', '**/*.cjs', '**/*.mjs'],
    rules: {
      "testing-library/no-container": "warn",
      "testing-library/prefer-screen-queries": "warn",
      "testing-library/no-node-access": ["warn"],
      "react/no-multi-comp": [
        "warn",
        {
          "ignoreStateless": false
        }
      ],
      "no-console": "warn",
      "react/no-children-prop": "warn",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": [
        "error",
        {
          "forbid": [
            {
              "char": ">",
              "alternatives": ["&gt;"]
            },
            {
              "char": "}",
              "alternatives": ["&#125;"]
            }
          ]
        }
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": [
        "error",
        {
          "enableDangerousAutofixThisMayCauseInfiniteLoops": true
        }
      ],
      "import/default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-named-as-default": "off",
      "no-self-compare": "warn",
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
          ],
        },
      ],
    },
  },
];
