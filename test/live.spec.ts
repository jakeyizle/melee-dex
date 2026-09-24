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
 * End-to-end cover for the live path, which is the app's whole reason to exist
 * and is otherwise only ever verified by hand: a replay appears in the watched
 * directory, `fs.watch` picks it up, main parses it and emits
 * `live-replay-loaded`, and the dashboard swaps to the head-to-head card.
 *
 * It also covers identity rule B. No connect code is ever entered, so the only
 * way a record can appear is the app working out which of the two players is
 * the user from the game itself.
 *
 * Nothing here is faked but the folder picker: the replay directory is a real
 * temp folder, and the live game is a real .slp copied into it while the app is
 * running.
 */

const root = path.join(__dirname, "..");
const testdata = path.join(root, "testdata");

// Every valid replay in testdata has JAKE#193 in it, and each opponent once,
// so the library tells the two players in any live game apart.
const SEEDED = [
  "Game_20200727T230003.slp", // vs HYRU#485
  "Game_20200729T230153.slp", // vs CUNT#279
  "Game_20250417T230155.slp", // vs CHTR#448
  "Game_20250420T214804.slp", // vs SHKN#614
];
/** Copied in mid-session under a new name, so it reads as a new game. */
const LIVE_GAME_SOURCE = "Game_20250505T223105.slp"; // JAKE#193 vs KENJ#707
const LIVE_GAME_NAME = "Game_20250506T120000.slp";

let electronApp: ElectronApplication;
let page: Page;
let userDataDir: string;
let replayDir: string;

const suite = process.platform === "linux" ? describe.skip : describe;

suite("a game starting while the app is running", () => {
  beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-live-"));
    replayDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-replays-"));
    for (const name of SEEDED) {
      fs.copyFileSync(path.join(testdata, name), path.join(replayDir, name));
    }

    electronApp = await electron.launch({
      args: [".", "--no-sandbox", `--user-data-dir=${userDataDir}`],
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "development",
        // No live traffic to slippi.gg from the test suite.
        MELEE_DEX_DISABLE_RANK_LOOKUPS: "1",
      },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await electronApp.evaluate(async ({ dialog }, directory) => {
      dialog.showOpenDialog = async () =>
        ({ canceled: false, filePaths: [directory] }) as any;
    }, replayDir);
  }, 60_000);

  afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "test/screenshots/live.png" });
      await page.close();
    }
    await electronApp?.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(replayDir, { recursive: true, force: true });
  });

  test("the seeded replays import and the app starts listening", async () => {
    await page.getByRole("button", { name: "Go to Settings" }).click();
    await page.getByRole("button", { name: "Browse" }).click();

    await expect
      .poll(() => page.locator("input[readonly]").inputValue(), {
        timeout: 15_000,
      })
      .toBe(replayDir);

    await page.getByRole("button", { name: "Save Settings" }).click();

    // The watcher is only attached once the import finishes, so the live part
    // of this spec depends on reaching this state first.
    await expect
      .poll(() => page.getByText("Listening for Games").isVisible(), {
        timeout: 120_000,
      })
      .toBe(true);
  }, 180_000);

  test("a replay appearing in the directory brings up the live view", async () => {
    fs.copyFileSync(
      path.join(testdata, LIVE_GAME_SOURCE),
      path.join(replayDir, LIVE_GAME_NAME),
    );

    await expect
      .poll(() => page.getByText("Head to Head").isVisible(), {
        timeout: 60_000,
      })
      .toBe(true);
  }, 90_000);

  // Rule B, end to end. No connect code was ever typed, and the identity card
  // never appeared — the app worked out which player is the user from the game
  // itself, because the library tells the two of them apart.
  test("the user is identified from the game without ever being asked", async () => {
    expect(await page.getByText("Which of these is you?").isVisible()).toBe(
      false,
    );

    await expect
      .poll(() =>
        page.getByText("JAKE#193", { exact: true }).first().isVisible(),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.getByText("KENJ#707", { exact: true }).first().isVisible(),
      )
      .toBe(true);
  }, 60_000);

  // Tier 1 has to answer even when there is no history, which is the case the
  // card used to render nothing at all for.
  test("an opponent never played before is named as such", async () => {
    await expect
      .poll(() => page.getByText(/First time against/).isVisible())
      .toBe(true);
  }, 30_000);

  test("the finished game is folded into the library", async () => {
    await page.getByRole("link", { name: "Library" }).click();

    await expect
      .poll(() => page.getByText("Overall Stats").isVisible(), {
        timeout: 30_000,
      })
      .toBe(true);

    // Four seeded plus the one that just finished. Polled, because the fold
    // happens when main reports the finished replay, not when the card renders.
    await expect
      .poll(
        () =>
          page
            .getByText("Total Games Played")
            .locator("xpath=following-sibling::*[1]")
            .textContent(),
        { timeout: 30_000 },
      )
      .toMatch(/^5 \(\d+ - \d+\)$/);
  }, 60_000);
});
