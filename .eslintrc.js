module.exports = {
  env: {
    es6: true,
    node: true
  },
  root: true,
  parserOptions: {
    parser: '@typescript-eslint/parser',
    project: './tsconfig.json',
    sourceType: 'module',
    ecmaVersion: 2018
  },
  plugins: [
    '@typescript-eslint',
    '@typescript-eslint/eslint-plugin'
  ],
  extends: [
    'standard',
    'standard-with-typescript'
  ],
  rules: {
    'generator-star-spacing': 'off',
    'no-debugger': process.env.NODE_ENV === 'prod' ? 'error' : 'off',
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
      max: 1
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
      { SwitchCase: 2 }
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
    'max-lines': ['error', 700]
  },
  overrides: [{
    files: ['*.test.ts'],
    rules: {
      'no-magic-numbers': 0,
      'max-nested-callbacks': 0,
      'max-lines-per-function': 0,
      'complexity': 0,
      'max-depth': 0,
      'max-len': 0,
      'max-lines': 0,
      'no-console': 0
    }
  }]
}
