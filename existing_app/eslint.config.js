/** Standalone lint rules preserve the inspected preset's applicable checks.
 * Platform container/capability/auto-audit restrictions have been removed.
 * Parser aliases, React hook rules and Nest provider checks remain active.
 */
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const hooks = require('eslint-plugin-react-hooks');
const imports = require('eslint-plugin-import');
const nestImport = require('@darraghor/eslint-plugin-nestjs-typed');
const nest = nestImport.default || nestImport;
const clientRules = {
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-empty-interface": "off",
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/no-redeclare": "error",
  "react/jsx-no-undef-props": "off",
  "react/no-unknown-property": "off",
  "no-undef": "off",
  "no-console": "off",
  "prefer-const": "off",
  "no-control-regex": "off",
  "no-useless-escape": "off",
  "no-case-declarations": "off",
  "no-empty": "off",
  "import/no-unresolved": [
    "error",
    {
      "ignore": [
        "\\?raw$"
      ]
    }
  ],
  "no-constant-binary-expression": "off",
  "react-refresh/only-export-components": "off",
  "no-restricted-imports": [
    "error",
    {
      "paths": [
        {
          "name": "next/link",
          "message": "Importing from 'next/link' is prohibited. Please use the `Link` component from 'react-router-dom' for navigation."
        }
      ]
    }
  ],
  "no-restricted-syntax": [
    "error",
    {
      "selector": "AssignmentExpression[left.object.object.name=\"window\"][left.object.property.name=\"location\"][left.property.name=\"href\"]",
      "message": "Please don't use `window.location.href` to navigate. Use `useNavigate` hook from 'react-router-dom' instead."
    },
    {
      "selector": "AssignmentExpression[left.object.name=\"location\"][left.property.name=\"href\"]",
      "message": "Please don't use `location.href` to navigate. Use `useNavigate` hook from 'react-router-dom' instead."
    },
    {
      "selector": "JSXOpeningElement[name.name='a']:has(JSXAttribute[name.name='href'][value.value=/^(?!https?:|\\u002F\\u002F|mailto:|tel:|#).+/])",
      "message": "Please don't use relative paths in <a> tags. Use NavLink from 'react-router-dom' instead."
    },
    {
      "message": "Please don't use fetch, use Generated API Client instead",
      "selector": "CallExpression[callee.name='fetch'][arguments.0.type='Literal'][arguments.0.value=/^\\u002F/]"
    },
    {
      "selector": "CallExpression[callee.object.name='console'][callee.property.name=/^(log|warn|info|debug|trace)$/]",
      "message": "Avoid using console.log, console.warn, etc. Use `client/src/lib/logger` instead."
    },
    {
      "message": "Please don't use window.alert, use `Dialog` component instead for better user experience and consistency",
      "selector": "MemberExpression[object.name='window'][property.name='alert']"
    },
    {
      "message": "Please don't use window.confirm, use `Dialog` component instead for better user experience and consistency",
      "selector": "MemberExpression[object.name='window'][property.name='confirm']"
    },
    {
      "message": "Please don't use alert. It may conflict with window.alert BOM method, use `Dialog` component instead for better user experience and consistency",
      "selector": "CallExpression[callee.name='alert']"
    },
    {
      "message": "Please don't use confirm. It may conflict with window.confirm BOM method, use `Dialog` component instead for better user experience and consistency",
      "selector": "CallExpression[callee.name='confirm']"
    }
  ]
};
const serverRules = {
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-empty-interface": "off",
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/no-redeclare": "error",
  "@typescript-eslint/no-extraneous-class": "off",
  "no-undef": "off",
  "no-console": "error",
  "prefer-const": "off",
  "no-empty": "off",
  "no-control-regex": "off",
  "no-useless-escape": "off",
  "no-case-declarations": "off",
  "import/no-unresolved": "error",
  "import/no-extraneous-dependencies": "error",
  "@darraghor/nestjs-typed/injectable-should-be-provided": [
    "error",
    {
      "src": [
        "./server/**/*.ts"
      ],
      "filterFromPaths": [
        "dist",
        "node_modules",
        ".test.",
        ".spec.",
        "server/mcp/ui/"
      ]
    }
  ],
  "@darraghor/nestjs-typed/api-property-returning-array-should-set-array": "off",
  "@darraghor/nestjs-typed/api-property-matches-property-optionality": "off",
  "@darraghor/nestjs-typed/all-properties-have-explicit-defined": "off",
  "@darraghor/nestjs-typed/controllers-should-supply-api-tags": "off",
  "@darraghor/nestjs-typed/api-method-should-specify-api-response": "off",
  "@darraghor/nestjs-typed/api-method-should-specify-api-operation": "off",
  "@darraghor/nestjs-typed/api-enum-property-best-practices": "off",
  "@darraghor/nestjs-typed/all-properties-are-whitelisted": "off"
};
module.exports = tseslint.config(
  { ignores: ['dist/**', 'dist-server/**', 'build/**', 'coverage/**', 'node_modules/**', 'source_package/**', 'client/src/api/gen/**', 'server/mcp/ui/**', '**/*.d.ts', '**/*.js.map', '.local-baselines/**', '.local-backups/**', '.local-tools/**'] },
  {
    files: ['tests/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node, NodeJS: true } },
  },
  {
    files: ['scripts/**/*.cjs', 'tests/**/*.cjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['client/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { project: './tsconfig.app.json' } },
    plugins: { 'react-hooks': hooks, import: imports },
    settings: { 'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] }, alias: { map: [['@', './client/src'], ['@client', './client'], ['@shared', './shared']], extensions: ['.js', '.jsx', '.ts', '.tsx'] } } },
    rules: clientRules,
  },
  {
    files: ['server/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, ...nest.configs.flatRecommended],
    languageOptions: { globals: { ...globals.node, NodeJS: true }, parserOptions: { project: './tsconfig.node.json' } },
    plugins: { import: imports },
    settings: { 'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] }, alias: { map: [['@server', './server'], ['@shared', './shared']], extensions: ['.js', '.jsx', '.ts', '.tsx'] } } },
    rules: serverRules,
  },
);
