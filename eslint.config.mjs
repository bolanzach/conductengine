import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
  pluginJs.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettierConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "typescript-eslint/no-unused-vars": "off",
    }
  },
)