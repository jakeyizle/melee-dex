import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: __dirname,
    // e2e specs only. The unit suite lives in test/unit and runs from
    // vitest.unit.config.ts, which supplies the "@" alias these do not need.
    include: ['test/*.spec.ts'],
    testTimeout: 1000 * 29,
    // The app takes a single-instance lock, so two specs launching Electron at
    // the same time would make the second one quit on startup.
    fileParallelism: false,
  },
})
