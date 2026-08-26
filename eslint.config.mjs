import { defineConfig } from "eslint/config";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";

export default defineConfig(
  {
    ignores: ["**/node_modules", "**/dist", "**/out", "**/components/ui/**/*"],
  },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat["jsx-runtime"],
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
      perfectionist: eslintPluginPerfectionist,
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "perfectionist/sort-imports": [
        "warn",
        {
          type: "line-length",
          order: "asc",
          groups: [
            "type",
            ["builtin", "external"],
            "internal",
            ["parent", "sibling", "index"],
            "side-effect",
            "style",
          ],
          newlinesBetween: 1,
          internalPattern: ["^@/"],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
