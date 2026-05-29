import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      exclude: ["src/test/setup.ts", "src/shared/api/electronBridge.d.ts", "src/shared/types/core.ts"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95
      }
    },
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"]
  }
});
