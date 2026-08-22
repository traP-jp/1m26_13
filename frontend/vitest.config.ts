import { defineConfig, mergeConfig } from "vitest/config";

import { createBaseConfig } from "./vite.config.ts";

export default mergeConfig(
  createBaseConfig(),
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
    },
  }),
);
