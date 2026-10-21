import { defineConfig } from "vitest/config";

// Unit tests for logic that doesn't need a browser (npm test). Screens are
// covered end to end by Playwright (npm run test:e2e).
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    include: ["app/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
  },
});
