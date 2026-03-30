import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    rules: { 'prettier/prettier': 'error' }
  },
  { ignores: ['dist/**', 'node_modules/**'] }
);
