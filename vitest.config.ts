import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "api/**/*.ts",
        "shared/**/*.ts",
        "src/admin/**/*.ts",
        "src/admin/**/*.tsx",
      ],
    },
  },
});
