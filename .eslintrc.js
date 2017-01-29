module.exports = {
  // So parent files don't get applied
  root: true,
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true,
  },
  globals: {
    expect: true,
  },
  extends: 'airbnb',
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 7,
    sourceType: 'module',
  },
  plugins: [
    'babel',
    'jsx-a11y',
    'mocha',
  ],
  rules: {
    'max-len': ['error', 100, 2, {
      ignoreUrls: true,
    }], // airbnb is allowing some edge cases
    'array-bracket-spacing': ['error', 'never'],
    'arrow-body-style': 'off',
    'consistent-this': ['error', 'self'],
    'func-names': 'off',
    'no-shadow': 'off',
    'prefer-arrow-callback': 'off',
    'global-require': 'off',
    'no-console': 'error', // airbnb is using warn
    'no-param-reassign': 'off',
    'no-prototype-builtins': 'off',
    'no-use-before-define': ['error', { 'functions': false }], // airbnb have functions: true, annoying
    'object-curly-spacing': 'off', // use babel plugin rule
    'operator-linebreak': ['error', 'after'], // aibnb is disabling this rule
    'no-restricted-syntax': 'off',
    'babel/object-curly-spacing': ['error', 'always'],
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'react/require-default-props': 'off', // airbnb use error
    'react/jsx-handler-names': ['error', { // airbnb is disabling this rule
      eventHandlerPrefix: 'handle',
      eventHandlerPropPrefix: 'on',
    }],
    'react/forbid-prop-types': 'off', // airbnb use error
    'react/jsx-filename-extension': ['error', {extensions: ['.js']}], // airbnb is using .jsx
    'react/jsx-max-props-per-line': ['error', {maximum: 3}], // airbnb is disabling this rule
    'react/no-danger': 'error', // airbnb is using warn
    'react/no-direct-mutation-state': 'error', // airbnb is disabling this rule
    'react/no-unused-prop-types': 'off', // Is still buggy
    'react/sort-prop-types': 'error', // airbnb do nothing here.
    'react/sort-comp': [2, {
      order: [
        'static-methods',
        'lifecycle',
        // 'properties', // not real -- NEEDS A PR!!!
        // '/^handle.+$/', // wishlist -- needs above first
        // '/^(get|set)(?!(InitialState$|DefaultProps$|ChildContext$)).+$/', // wishlist -- needs above first
        'everything-else',
        '/^render.+$/',
        'render'
      ],
    }],
    'mocha/handle-done-callback': 'error',
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-global-tests': 'error',
    'mocha/no-pending-tests': 'error',
    'mocha/no-skipped-tests': 'error',
    'semi': ['error', 'never'],
  },
};
