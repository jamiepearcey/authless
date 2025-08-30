module.exports = {
  extends: [
    "eslint:recommended"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    }
  },
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  ignorePatterns: ["node_modules/", "dist/", ".next/", "*.config.js", "tailwind.config.ts"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "no-undef": "off" // TypeScript handles this
  }
};