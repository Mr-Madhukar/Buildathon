import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "client/dist/**",
      "node_modules/**",
      "**/node_modules/**",
      "client/node_modules/**",
      "server/node_modules/**"
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off"
    }
  }
];
