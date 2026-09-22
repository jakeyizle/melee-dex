import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  type ElectronApplication,
  type Page,
  _electron as electron,
} from "playwright";
import { beforeAll, afterAll, describe, expect, test } from "vitest";

/**
 * End-to-end cover for the replay import path: the settings UI, the
 * select-directory IPC handler, the file walk, the utilityProcess workers that
 * parse .slp files, IndexedDB, and the counts the dashboard finally renders.
 *
 * The only thing faked is the native directory picker, which cannot be driven
 * from Playwright. Everything either side of it is the real application.
 */

const root = path.join(__dirname, "..");
const testdata = path.join(root, "testdata");

let electronApp: ElectronApplication;
let page: Page;
let userDataDir: string;

// Skipped on linux for the same reason as e2e.spec.ts.
const suite = process.platform === "linux" ? describe.skip : describe;

suite("importing a replay directory", () => {
  beforeAll(async () => {
    // A throwaway profile so the IndexedDB starts empty on every run.
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-e2e-"));

    electronApp = await electron.launch({
      args: [".", "--no-sandbox", `--user-data-dir=${userDataDir}`],
      cwd: root,
      env: { ...process.env, NODE_ENV: "development" },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Stand in for the OS folder picker, so "Browse" resolves to testdata/.
    await electronApp.evaluate(async ({ dialog }, directory) => {
      dialog.showOpenDialog = async () =>
        ({ canceled: false, filePaths: [directory] }) as any;
    }, testdata);
  }, 60_000);

  afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "test/screenshots/import.png" });
      await page.close();
    }
    await electronApp?.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  test("a fresh install asks for a replay directory", async () => {
    await expect
      .poll(
        () =>
          page
            .getByRole("heading", { name: "Set Up Your Replay Directory" })
            .isVisible(),
        { timeout: 30_000 },
      )
      .toBe(true);
  }, 60_000);

  test("choosing a directory in settings imports the replays it contains", async () => {
    await page.getByRole("button", { name: "Go to Settings" }).click();
    await page.getByRole("button", { name: "Browse" }).click();

    // The chosen directory is echoed back into the read-only field.
    await expect
      .poll(() => page.locator("input[readonly]").inputValue(), {
        timeout: 15_000,
      })
      .toBe(testdata);

    await page.getByRole("button", { name: "Save Settings" }).click();

    // Importing forks parser workers that parse every .slp in testdata,
    // one of which is 9MB, so this is deliberately generous.
    await expect
      .poll(() => page.getByText("Listening for Games").isVisible(), {
        timeout: 120_000,
      })
      .toBe(true);
  }, 180_000);

  test("reports what it imported and what it rejected", async () => {
    const loaded = page.getByText("Total replays loaded");
    const rejected = page.getByText("Replays rejected");
    await expect.poll(() => loaded.isVisible(), { timeout: 15_000 }).toBe(true);

    const loadedCount = await loaded
      .locator("xpath=preceding-sibling::*[1]")
      .textContent();
    const rejectedCount = await rejected
      .locator("xpath=preceding-sibling::*[1]")
      .textContent();

    // testdata/ holds 7 *.slp files (the .slp.old is not matched by the walk).
    // Six are valid; Game_20250422T214211.slp is 24 frames long and is rejected.
    expect(rejectedCount).toBe("1");

    // BUG (src/CLAUDE.md "Known behavior quirks" #3): the displayed total counts
    // the "latestReplayKey" pointer as though it were a replay, so six imported
    // replays are reported as seven. Asserted as-is so the UI stays pinned.
    expect(loadedCount).toBe("7");
  });

  test("the imported replays survive a restart", async () => {
    await page.reload();

    await expect
      .poll(() => page.getByText("Listening for Games").isVisible(), {
        timeout: 120_000,
      })
      .toBe(true);

    const loadedCount = await page
      .getByText("Total replays loaded")
      .locator("xpath=preceding-sibling::*[1]")
      .textContent();

    // Nothing is re-parsed: the replays are already in IndexedDB.
    expect(loadedCount).toBe("7");
  }, 180_000);
});
