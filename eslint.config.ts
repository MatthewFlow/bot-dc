import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      prettier: prettierPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "prettier/prettier": "warn",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // bot/api mają verbatimModuleSyntax: true — wymaga import type dla typów
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // apps/panel — React 19 + Next.js 16 (App Router)
  // Jawne reguły zamiast spreadu flat.recommended — omija bugi ESLint 10
  // w regułach klasowych (no-direct-mutation-state itp.) nieużywanych w tym projekcie
  {
    files: ["apps/panel/src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    settings: {
      react: { version: "19.0" },
    },
    rules: {
      // JSX poprawność
      "react/jsx-key": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-vars": "warn",
      // Komponenty
      "react/no-children-prop": "warn",
      "react/no-danger-with-children": "error",
      "react/no-deprecated": "warn",
      "react/no-unescaped-entities": "warn",
      "react/no-unknown-property": "error",
      // Hooki — tylko klasyczne dwie reguły (v7 dodał reguły React Compiler — nie używamy)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Next.js — reguły specyficzne dla App Routera (next lint wycofany w Next 16)
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Czysty App Router — brak katalogu `pages`, więc ta reguła tylko hałasuje.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Musi być ostatni — wyłącza reguły formatowania kolidujące z Prettierem
  prettierConfig,
);
