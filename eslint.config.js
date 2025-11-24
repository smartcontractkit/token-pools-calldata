// @ts-check

const eslint = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'output/**',
      'coverage/**',
      '*.config.js',
      'eslint.config.js',
      'src/typechain/**',
    ],
  },

  // Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      // Extend TypeScript recommended rules
      ...tsPlugin.configs['recommended'].rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,

      // Prettier integration
      ...prettier.rules,
      'prettier/prettier': 'error',

      // Custom TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'error',
      
      // Allow empty interfaces that extend other types (common pattern)
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Configuration for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      // Extend TypeScript recommended rules
      ...tsPlugin.configs['recommended'].rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,

      // Prettier integration
      ...prettier.rules,
      'prettier/prettier': 'error',

      // Custom TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'error',
      
      // Allow empty interfaces in tests
      '@typescript-eslint/no-empty-object-type': 'off',
      
      // Disable no-undef in test files since Jest globals are defined
      'no-undef': 'off',
    },
  },
];

