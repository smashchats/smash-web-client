import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'smash-node-lib/**/*',
            'dist/**/*',
            'node_modules/**/*',
            'dev-dist/**/*',
            '.expo/**/*',
            'public/sw.js',
            'public/workbox-*.js',
            'coverage/**/*',
            '*.config.js',
            '*.config.ts',
        ],
    },
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                React: true,
            },
            parser: tseslint.parser,
            parserOptions: {
                sourceType: 'module',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            import: importPlugin,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'warn',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
        settings: {
            'import/resolver': {
                alias: {
                    map: [
                        ['@shared', './src/shared'],
                        ['@services', './src/services'],
                        ['@features', './src/features'],
                        ['@app', './src/app'],
                    ],
                    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
                },
            },
        },
    },
);
