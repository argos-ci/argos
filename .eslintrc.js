module.exports = {
  root: true, // So parent files don't get applied
  env: {
    jest: true,
    es6: true,
    browser: true,
    node: true,
  },
  extends: ['airbnb', 'plugin:import/recommended'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 7,
    sourceType: 'module',
  },
  plugins: ['babel', 'import', 'jsx-a11y', 'prettier', 'jest'],
  settings: {
    'import/resolver': {
      node: {
        // As configured in webpack and jest
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
  rules: {
    'max-len': ['error', 100, 2, { ignoreUrls: true }],
    'arrow-parens': 'off', // Incompatible with prettier
    'no-confusing-arrow': 'off', // Incompatible with prettier
    indent: 'off', // Incompatible with prettier
    'no-mixed-operators': 'off', // Incompatible with prettier
    'space-before-function-paren': 'off', // Incompatible with prettier
    semi: ['error', 'never'],
    'no-shadow': 'off',
    'no-console': 'error', // Airbnb use 'warn'
    'no-param-reassign': 'off',
    'no-nested-ternary': 'off',
    'no-use-before-define': ['error', { functions: false, classes: false }],
    'global-require': 'off', // Sounds like a great pattern!
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      },
    ],

    'react/jsx-wrap-multilines': 'off', // Incompatible with prettier
    'react/jsx-closing-bracket-location': 'off', // Incompatible with prettier
    'react/jsx-indent': 'off', // Incompatible with prettier
    'react/jsx-indent-props': 'off', // Incompatible with prettier
    'react/jsx-filename-extension': ['error', { extensions: ['.js'] }],
    'react/prop-types': 'off',
    'react/require-default-props': 'off',
    'react/forbid-prop-types': 'off',
    'react/no-unused-prop-types': 'off', // Doesn't work correctly.

    'import/unambiguous': 'off',
    'import/namespace': 'off', // Do no work?
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }], // Airbnb forbid devDependencies
    'import/no-unresolved': 'off', // Do not know webpack tricks
    'import/extensions': 'off', // Issue with storybook

    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'es5',
        semi: false,
      },
    ],
  },
}
