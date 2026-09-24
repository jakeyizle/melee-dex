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
 * Three things that exist only when the real app is running.
 *
 * - **Settings round-trip.** The jsdom tests mock the db layer entirely, and the
 *   repository tests run against an in-memory fake, so nothing yet proves a
 *   connect code typed into Settings reaches real IndexedDB and comes back.
 * - **`HashRouter` over `file://`.** The packaged app has no server, which is
 *   the whole reason the router is hash-based. Component tests use
 *   `MemoryRouter`, so a reload on a route other than `/` has never been tried.
 * - **Dropping the database.** The only destructive action in the app, and the
 *   only reset it offers. jsdom asserts the dialog gate with `dropDB` mocked;
 *   whether it actually empties every store is a different question.
 *
 * Ordered deliberately: the delete comes last, because it destroys the state
 * the earlier tests rely on.
 */

const root = path.join(__dirname, "..");
const testdata = path.join(root, "testdata");
const LOCALFORAGE = path.join(
  root,
  "node_modules/localforage/dist/localforage.min.js",
);

const SEEDED = ["Game_20250421T224653.slp", "Game_20250420T214804.slp"];
const CONNECT_CODE = "JAKE#193";

let electronApp: ElectronApplication;
let page: Page;
let userDataDir: string;
let replayDir: string;

const suite = process.platform === "linux" ? describe.skip : describe;

const waitForListening = () =>
  page
    .getByText("Listening for Games")
    .waitFor({ state: "visible", timeout: 120_000 });

const injectLocalforage = () => page.addScriptTag({ path: LOCALFORAGE });

const readSetting = (key: string) =>
  page.evaluate(async (settingKey) => {
    const store = (window as any).localforage.createInstance({
      name: "db",
      storeName: "settings",
    });
    return store.getItem(settingKey);
  }, key);

suite("what survives, and what a reset removes", () => {
  beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-persist-"));
    replayDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "meleedex-persist-replays-"),
    );
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
  }, 120_000);

  afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "test/screenshots/persistence.png" });
      await page.close();
    }
    await electronApp?.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(replayDir, { recursive: true, force: true });
  });

  test("a connect code typed in settings reaches storage", async () => {
    await page.getByRole("button", { name: "Go to Settings" }).click();
    await page.getByRole("button", { name: "Browse" }).click();
    await page.waitForFunction(
      (directory) =>
        (document.querySelector("input[readonly]") as HTMLInputElement)
          ?.value === directory,
      replayDir,
      { timeout: 15_000 },
    );

    await page
      .getByPlaceholder("Enter your Slippi connect code...")
      .fill(CONNECT_CODE);
    await page.getByRole("button", { name: "Save Settings" }).click();

    await waitForListening();
    await injectLocalforage();

    expect(await readSetting("username")).toBe(CONNECT_CODE);
    expect(await readSetting("replayDirectory")).toBe(replayDir);
  }, 180_000);

  test("it is still there after a restart, and the stats are built for it", async () => {
    await page.reload();
    await waitForListening();

    await page.getByRole("link", { name: "Library" }).click();

    // No identity prompt: the code was stored, so the stats were built for it
    // without asking.
    await page
      .getByText("Overall Stats")
      .waitFor({ state: "visible", timeout: 30_000 });
    expect(await page.getByText("Which of these is you?").isVisible()).toBe(
      false,
    );
  }, 120_000);

  // The packaged app loads over file://, so there is no server to serve a path.
  // A reload anywhere other than the root is the case HashRouter exists for.
  test("reloading on a route other than the root keeps that route", async () => {
    expect(page.url()).toContain("#/library");

    await page.reload();

    await page
      .getByText("Overall Stats")
      .waitFor({ state: "visible", timeout: 60_000 });
    expect(page.url()).toContain("#/library");
  }, 120_000);

  test("settings is reachable and shows what was stored", async () => {
    await page.getByRole("link", { name: "Settings" }).click();

    await expect
      .poll(() =>
        page.getByPlaceholder("Enter your Slippi connect code...").inputValue(),
      )
      .toBe(CONNECT_CODE);
  }, 60_000);

  // Last: it destroys everything above.
  test("deleting the database really empties it", async () => {
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByLabel("Type 'delete' to confirm").fill("delete");
    await page.getByRole("button", { name: "Delete Database" }).click();

    // Back to the first-run screen, because the replay directory went with it.
    await page
      .getByRole("heading", { name: "Set Up Your Replay Directory" })
      .waitFor({ state: "visible", timeout: 60_000 });

    await injectLocalforage();
    const remaining = await page.evaluate(async () => {
      const read = async (storeName: string) => {
        const store = (window as any).localforage.createInstance({
          name: "db",
          storeName,
        });
        return store.keys();
      };
      return {
        settings: await read("settings"),
        replays: await read("replays"),
        badReplays: await read("badReplays"),
      };
    });

    expect(remaining.settings).toEqual([]);
    expect(remaining.replays).toEqual([]);
    expect(remaining.badReplays).toEqual([]);
  }, 120_000);
});
