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
    include: ["test/unit/**/*.test.ts", "test/unit/**/*.test.tsx"],
    // Node by default — the logic tests need nothing else and start faster for
    // it. Component tests opt into a DOM with `// @vitest-environment jsdom`
    // at the top of the file.
    environment: "node",
    // Parsing a 9MB replay with getStats() is slow; replayParsing.test.ts needs the headroom.
    testTimeout: 1000 * 60,
    coverage: {
      provider: "v8",
      include: ["src/**", "electron/**"],
      exclude: [
        // Entry points and wiring: no branches, and only meaningful with a
        // real Electron process behind them. The e2e specs cover these.
        "src/main.tsx",
        "src/App.tsx",
        "src/Layout.tsx",
        "electron/main/index.ts",
        "electron/main/vite_constants.ts",
        "electron/preload/**",
        // Props-to-JSX with no decisions in them. Covering these would move
        // the number without catching anything — see src/CLAUDE.md.
        "src/components/**/index.tsx",
        "src/components/PaperDisplay/**",
        "src/components/DashboardPage/LiveMatchDisplay/GamesPlayedPaperDisplay.tsx",
        "src/components/DashboardPage/LiveMatchDisplay/NewHeadToHeadCard/HeadToHeadScore.tsx",
        "src/components/DashboardPage/LiveMatchDisplay/NewHeadToHeadCard/PlayerAvatar.tsx",
        "src/assets/**",
        "**/*.d.ts",
      ],
    },
  },
});
