import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // wyłącza reguły ESLint gryzące się z Prettierem
  prettierConfig,

  {
    plugins: {
      prettier: prettierPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // prettier jako warning
      "prettier/prettier": "warn",

      // ===== IMPORT / EXPORT SORT =====
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",

      // porządki pod TS
      "no-console": "off",
    },
  },

  {
    ignores: ["node_modules/**", "dist/**", "build/**", "coverage/**", "src/data/**"],
  },
];
