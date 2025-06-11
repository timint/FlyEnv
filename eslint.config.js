import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import typescript from "@typescript-eslint/eslint-plugin";
import parser from "vue-eslint-parser";
import prettier from "eslint-plugin-prettier";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.vue"],
    languageOptions: {
      parser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      vue,
      "@typescript-eslint": typescript,
      prettier
    },
    rules: {
      "@typescript-eslint/ban-ts-ignore": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-empty-function": "off",
      "vue/custom-event-name-casing": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^h$",
          varsIgnorePattern: "^h$"
        }
      ],
      "no-unused-vars": "off",
      "space-before-function-paren": "off",
      "quotes": ["error", "single", { allowTemplateLiterals: true }],
      "comma-dangle": ["error", "never"]
    }
  }
]);
