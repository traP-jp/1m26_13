import js from "@eslint/js";
import { withVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import prettier from "eslint-config-prettier/flat";
import oxlint from "eslint-plugin-oxlint";
import pluginVue from "eslint-plugin-vue";

export default withVueTs(
  {
    rootDir: import.meta.dirname,
  },
  {
    ignores: ["dist/**", "coverage/**"],
  },
  js.configs.recommended,
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
  prettier,
);
