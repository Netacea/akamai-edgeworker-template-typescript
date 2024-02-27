module.exports = {
  env: {
    es6: true,
    node: true
  },
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      modules: true
    },
    project: [
      './tsconfig.json'
    ]
  },
  plugins: [
    'typescript'
  ],
  rules: {
    'no-unused-vars': 'off',
    'typescript/no-unused-vars': 'error',
    'generator-star-spacing': 'off',
    'no-debugger': 'off',
    'prefer-destructuring': ['error',
      {
        VariableDeclarator: {
          array: false,
          object: true
        },
        AssignmentExpression: {
          array: false,
          object: false
        }
      },
      {
        enforceForRenamedProperties: false
      }
    ],
    'no-var': 'error',
    'prefer-const': 'error',
    'curly': ['error', 'multi-line', 'consistent'],
    'max-statements-per-line': ['error', {
      'max': 1
    }],
    'no-else-return': 'error',
    'no-loop-func': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'no-unneeded-ternary': 'error',
    'padded-blocks': ['error', 'never'],
    'quote-props': ['error', 'consistent-as-needed'],
    'no-console': 'error',
    'object-shorthand': 'error',
    'no-useless-rename': 'error',
    'indent': [
      'error',
      2,
      { SwitchCase: 1 }
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'max-nested-callbacks': ['error', 3],
    'max-lines-per-function': ['error', 50],
    'complexity': ['error', 10],
    'max-depth': ['error', 5],
    'max-len': ['error', 120],
    'max-lines': ['error', 700],
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-misused-promises': 'off', // disabled due to tape
    'no-return-await': 'off',
    'indent': 'off'
  }
}
