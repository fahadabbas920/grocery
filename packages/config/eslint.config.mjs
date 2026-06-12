import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared flat ESLint config for the monorepo.
 * Apps extend this and add framework-specific plugins (next, expo).
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.next/**", "**/.expo/**", "**/node_modules/**", "**/*.gen.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
);
