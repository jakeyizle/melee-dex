import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    root: __dirname,
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    // Parsing a 9MB replay with getStats() is slow; replayParsing.test.ts needs the headroom.
    testTimeout: 1000 * 60,
  },
});
