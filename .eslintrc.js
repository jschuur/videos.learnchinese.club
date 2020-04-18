module.exports = {
  env: {
    browser: true,
    es6: true
  },
  parser: 'babel-eslint',
  extends: ['airbnb', 'prettier', 'prettier/react'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
      modules: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['react', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/forbid-prop-types': [0, { forbid: ['any'] }],
    'react/prop-types': 0,
    'react/require-default-props': 0,
    'no-return-assign': [1, 'except-parens'],
    'no-param-reassign': 0,
    'one-var': [0, 'consecutive'],
    'import/no-absolute-path': 0,
    'import/prefer-default-export': 0,
    'no-underscore-dangle': [2, { allow: ['_id'] }],
    'prefer-const': [2, { destructuring: 'all' }],
    'no-unused-vars': [2, { args: 'none' }]
  },
  overrides: [
    {
      files: ['server/**/*.js', 'utils/**/*.js'],
      rules: {
        'no-console': 0
      }
    }
  ],
  env: {
    jest: true,
    browser: true,
    node: true
  },
  settings: {
    'import/resolver': {
      'babel-module': {}
    }
  }
};
