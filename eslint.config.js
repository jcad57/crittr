// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'ios/**', 'android/**'] },
  {
    // SDK58 enables additional compiler diagnostics on existing dev screens.
    // Keep these visible while migrating; rules-of-hooks and effect dependencies stay enforced.
    rules: Object.fromEntries(['refs','set-state-in-effect','preserve-manual-memoization','immutability','purity']
      .map(name => ['react-hooks/' + name, 'warn'])),
  },
  { files: ['scripts/**/*.js','plugins/**/*.js','tests/**/*.cjs'], languageOptions: { globals: { __dirname: 'readonly', module: 'readonly', require: 'readonly', process: 'readonly', console: 'readonly' } } },
  { files: ['supabase/functions/**/*.ts'], rules: { 'import/no-unresolved': ['error', { ignore: ['^https://', '^jsr:'] }] } },
]);
