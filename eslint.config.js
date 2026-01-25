const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
    {
        ignores: [
            'node_modules/',
            'dist/',
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,

    {
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
        },
    },

    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },

    {
        files: ['spec/**/*.js'],
        languageOptions: {
            parserOptions: {
                project: null,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            'no-undef': 'off',
        },
    },
);
