import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["dist/**", "coverage/**", "pnpm-lock.yaml", "src/api/schema.d.ts"],
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  arrowParens: "always",
  bracketSpacing: true,
  bracketSameLine: false,
  singleAttributePerLine: false,
  vueIndentScriptAndStyle: false,
  proseWrap: "preserve",
  sortImports: true,
  sortPackageJson: {
    sortScripts: true,
  },
});
