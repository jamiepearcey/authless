module.exports = {
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    // Disable rules that conflict with TypeScript
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-console": "warn",
  },
};