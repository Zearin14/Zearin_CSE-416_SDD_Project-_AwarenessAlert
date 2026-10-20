import { defineConfig } from "vitest/config"

// Separate from vite.config.ts so the Figma Make plugins are not loaded during tests.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/logic.ts", "src/api.ts"],
      reporter: [["text", { skipFull: false }], "html", "json-summary"],
      reportsDirectory: "docs/testing/evidence/coverage",
    },
  },
})
