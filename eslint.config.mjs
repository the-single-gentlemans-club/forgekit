import nx from '@nx/eslint-plugin';

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
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace)$/]",
        "message": "Unexpected property on console object was called"
      }
    ],
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
    "react/sort-prop-types": [
      "warn",
      {
        "callbacksLast": true,
        "ignoreCase": false,
        "requiredFirst": true,
        "sortShapeProp": true,
        "noSortAlphabetically": false
      }
    ]
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
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
