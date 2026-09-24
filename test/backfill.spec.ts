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
 * The one-time schema backfill, against real IndexedDB.
 *
 * This is the only path in the app that rewrites rows it already has, and every
 * existing user hits it exactly once on the first launch after upgrading. The
 * store and settings layers are unit-tested, but the thing that actually has to
 * work — an older library on disk being re-read and overwritten in place — only
 * exists when real IndexedDB, a real file walk and real parser workers are all
 * present.
 *
 * `localforage` is injected into the page and pointed at the same database the
 * app uses, so the setup writes rows exactly the way the app would rather than
 * guessing at the driver's storage format.
 */

const root = path.join(__dirname, "..");
const testdata = path.join(root, "testdata");
const LOCALFORAGE = path.join(
  root,
  "node_modules/localforage/dist/localforage.min.js",
);

const SEEDED = [
  "Game_20250421T224653.slp",
  "Game_20250420T214804.slp",
  "Game_20200727T230003.slp",
];
const CORRUPTED = SEEDED[0];

let electronApp: ElectronApplication;
let page: Page;
let userDataDir: string;
let replayDir: string;

const suite = process.platform === "linux" ? describe.skip : describe;

/** Reads one stored replay through the app's own storage layer. */
const readReplay = (name: string) =>
  page.evaluate(async (key) => {
    const store = (window as any).localforage.createInstance({
      name: "db",
      storeName: "replays",
    });
    return store.getItem(key);
  }, name);

const readSetting = (key: string) =>
  page.evaluate(async (settingKey) => {
    const store = (window as any).localforage.createInstance({
      name: "db",
      storeName: "settings",
    });
    return store.getItem(settingKey);
  }, key);

/**
 * Rewrites a stored replay with plausible-but-wrong values, the way a row
 * written by an older version would differ. A normal import cannot repair this:
 * it skips every replay whose name it already knows.
 */
const corruptStoredReplay = (name: string) =>
  page.evaluate(async (key) => {
    const store = (window as any).localforage.createInstance({
      name: "db",
      storeName: "replays",
    });
    const replay: any = await store.getItem(key);
    delete replay.mode;
    delete replay.matchId;
    delete replay.gameNumber;
    delete replay.lastFrame;
    replay.winnerConnectCode = "ZZZZ#999";
    await store.setItem(key, replay);
  }, name);

const setSchemaVersion = (version: string) =>
  page.evaluate(async (value) => {
    const store = (window as any).localforage.createInstance({
      name: "db",
      storeName: "settings",
    });
    await store.setItem("schemaVersion", value);
  }, version);

const injectLocalforage = async () => {
  await page.addScriptTag({ path: LOCALFORAGE });
};

/**
 * Playwright's own waiting, not `expect.poll` — the import has to be awaited
 * from `beforeAll` too, and `expect.poll` may only be called inside a test.
 */
const waitForListening = async () => {
  await page
    .getByText("Listening for Games")
    .waitFor({ state: "visible", timeout: 120_000 });
};

suite("upgrading a library written by an older version", () => {
  beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-bf-"));
    replayDir = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-bf-replays-"));
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

    // Import once, so there is a library to upgrade.
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
    await waitForListening();
    await injectLocalforage();
  }, 180_000);

  afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "test/screenshots/backfill.png" });
      await page.close();
    }
    await electronApp?.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(replayDir, { recursive: true, force: true });
  });

  test("a fresh import records the current schema version", async () => {
    expect(await readSetting("schemaVersion")).toBe("2");
  });

  test("the imported replays carry the fields the current schema adds", async () => {
    const replay: any = await readReplay(CORRUPTED);

    expect(replay.mode).toBe("unranked");
    expect(replay.lastFrame).toBeGreaterThan(30 * 60);
  });

  // The control. Without a version change this is an ordinary import, and an
  // ordinary import skips every name it already has — so the damage stands.
  // Without this, the test below would pass even if the backfill did nothing
  // and the rows were simply being re-imported for some other reason.
  test("an ordinary restart does not rewrite rows it already has", async () => {
    await corruptStoredReplay(CORRUPTED);

    await page.reload();
    await waitForListening();
    await injectLocalforage();

    const replay: any = await readReplay(CORRUPTED);
    expect(replay.winnerConnectCode).toBe("ZZZZ#999");
    expect(replay.mode).toBeUndefined();
  });

  test("an out-of-date library is re-read and repaired in place", async () => {
    await setSchemaVersion("1");

    await page.reload();
    await waitForListening();
    await injectLocalforage();

    const replay: any = await readReplay(CORRUPTED);
    expect(replay.winnerConnectCode).not.toBe("ZZZZ#999");
    expect(replay.mode).toBe("unranked");
    expect(replay.lastFrame).toBeGreaterThan(30 * 60);
  }, 180_000);

  test("the upgrade is recorded, so it happens only once", async () => {
    expect(await readSetting("schemaVersion")).toBe("2");

    // Prove it by damaging a row again and restarting: the backfill is spent.
    await corruptStoredReplay(CORRUPTED);
    await page.reload();
    await waitForListening();
    await injectLocalforage();

    const replay: any = await readReplay(CORRUPTED);
    expect(replay.winnerConnectCode).toBe("ZZZZ#999");
  }, 180_000);

  test("the library is not duplicated by the re-read", async () => {
    const names = await page.evaluate(async () => {
      const store = (window as any).localforage.createInstance({
        name: "db",
        storeName: "replays",
      });
      return store.keys();
    });

    expect(names).toHaveLength(SEEDED.length);
  });
});
