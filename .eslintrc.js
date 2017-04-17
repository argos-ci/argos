module.exports = {
  root: true,
  extends: 'airbnb',
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 7,
    sourceType: 'module',
  },
  env: {
    jest: true,
    browser: true,
  },
  rules: {
    'max-len': ['error', 100, 2, { ignoreUrls: true }],
    semi: ['error', 'never'],
    'no-shadow': 'off',
    'no-console': 'error', // Airbnb use 'warn'
    'no-param-reassign': 'off',
    'no-nested-ternary': 'off',
    'no-use-before-define': ['error', { functions: false, classes: false }],

    'react/jsx-filename-extension': ['error', { extensions: ['.js'] }],
    'react/prop-types': 'off',
    'react/require-default-props': 'off',
    'react/forbid-prop-types': 'off',
    'react/no-unused-prop-types': 'off', // Doesn't work correctly.

    'import/prefer-default-export': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        // As configured in webpack and jest
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
}
