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
 * A real import across several parser processes at once.
 *
 * `getNumberOfWorkers` is `min(cores - 1, 6, ceil(files / 10))`, and every other
 * spec imports seven files — one worker. So the pool's parallel behaviour, the
 * part where batches are split between processes and released by acks arriving
 * out of order, has never actually run outside the unit tests, where both the
 * worker and the renderer are fakes.
 *
 * What only this can prove: `utilityProcess` really forks the built worker
 * entry, `Replay` objects really survive structured-cloning back across the
 * process boundary, and the renderer really commits them all to IndexedDB. A
 * batch handed out twice, or dropped, shows up here as a count that is not 30.
 */

const root = path.join(__dirname, "..");
const testdata = path.join(root, "testdata");
const LOCALFORAGE = path.join(
  root,
  "node_modules/localforage/dist/localforage.min.js",
);

// The smallest valid replay in testdata, copied enough times to need three
// workers. Distinct names, so each copy is a distinct row.
//
// Three is what `min(cores - 1, 6, ceil(30 / 10))` gives on any machine with
// four or more cores; a smaller runner forks fewer. The assertions are about
// the invariant either way — every file stored exactly once — so the spec is
// correct on one worker and merely covers less.
const SOURCE = "Game_20250421T224653.slp";
const COPIES = 30;

let electronApp: ElectronApplication;
let page: Page;
let userDataDir: string;
let replayDir: string;

const suite = process.platform === "linux" ? describe.skip : describe;

suite("importing across several parser processes", () => {
  beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-pool-"));
    replayDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-pool-replays-"));
    const source = path.join(testdata, SOURCE);
    for (let index = 0; index < COPIES; index++) {
      fs.copyFileSync(
        source,
        path.join(replayDir, `Game_Copy_${String(index).padStart(3, "0")}.slp`),
      );
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

    await page.getByRole("button", { name: "Go to Settings" }).click();
    await page.getByRole("button", { name: "Browse" }).click();
    await page.waitForFunction(
      (directory) =>
        (document.querySelector("input[readonly]") as HTMLInputElement)
          ?.value === directory,
      replayDir,
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Save Settings" }).click();
    await page
      .getByText("Listening for Games")
      .waitFor({ state: "visible", timeout: 180_000 });
    await page.addScriptTag({ path: LOCALFORAGE });
  }, 300_000);

  afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "test/screenshots/workerPool.png" });
      await page.close();
    }
    await electronApp?.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(replayDir, { recursive: true, force: true });
  });

  // The discriminating assertion for the whole pool: a batch handed to two
  // workers double-counts, and a batch dropped on a worker that was retired or
  // crashed goes missing. Both land here as a number that is not 30.
  test("every replay is stored exactly once", async () => {
    const names: string[] = await page.evaluate(async () => {
      const store = (window as any).localforage.createInstance({
        name: "db",
        storeName: "replays",
      });
      return store.keys();
    });

    expect(names).toHaveLength(COPIES);
    expect(new Set(names).size).toBe(COPIES);
  });

  test("the dashboard reports what it loaded", async () => {
    const loaded = await page
      .getByText("Total replays loaded")
      .locator("xpath=preceding-sibling::*[1]")
      .textContent();

    expect(loaded).toBe(String(COPIES));
  });

  test("nothing was rejected", async () => {
    const rejected = await page
      .getByText("Replays rejected")
      .locator("xpath=preceding-sibling::*[1]")
      .textContent();

    expect(rejected).toBe("0");
  });

  // Every `Replay` is built in a Node process with no Chromium and sent back
  // over a message port. A field that cannot be structured-cloned is dropped
  // silently in transit rather than throwing.
  test("the replays arrive intact across the process boundary", async () => {
    const replay: any = await page.evaluate(async () => {
      const store = (window as any).localforage.createInstance({
        name: "db",
        storeName: "replays",
      });
      return store.getItem("Game_Copy_000.slp");
    });

    expect(replay).toMatchObject({
      name: "Game_Copy_000.slp",
      mode: "unranked",
      stageId: expect.any(String),
      winnerConnectCode: expect.stringContaining("#"),
    });
    expect(replay.players).toHaveLength(2);
    expect(replay.players[0].connectCode).toContain("#");
    expect(replay.lastFrame).toBeGreaterThan(30 * 60);
  });

  test("the whole library is counted into the stats", async () => {
    await page.getByRole("link", { name: "Library" }).click();
    await page
      .getByRole("button", { name: /#\d/ })
      .first()
      .click();

    await expect
      .poll(
        () =>
          page
            .getByText("Total Games Played")
            .locator("xpath=following-sibling::*[1]")
            .textContent(),
        { timeout: 30_000 },
      )
      .toMatch(new RegExp(`^${COPIES} \\(\\d+ - \\d+\\)$`));
  }, 60_000);
});
