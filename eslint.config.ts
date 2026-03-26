import js from '@eslint/js'
import ts from 'typescript-eslint'
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended'
import { defineConfig } from 'eslint/config'

const SCRIPT_FILES = ['**/*.{js,mjs,cjs,ts,mts,cts}']

export default defineConfig(
  { ...js.configs.recommended, files: SCRIPT_FILES },
  ...ts.configs.recommended.map((config) => ({
    ...config,
    files: SCRIPT_FILES,
  })),
  { ...prettierConfigRecommended, files: SCRIPT_FILES },
  {
    files: SCRIPT_FILES,
    rules: {
      'prettier/prettier': [
        'warn',
        {
          semi: false,
          singleQuote: true,
          printWidth: 80,
          tabWidth: 2,
          singleAttributePerLine: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { fixStyle: 'inline-type-imports' },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: ['dist', 'reports', 'node_modules'],
  },
)
