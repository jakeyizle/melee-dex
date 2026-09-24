import { describe, it, expect } from "vitest";
import {
  createSettingsRepository,
  REPLAY_SCHEMA_VERSION,
} from "@/db/settingsRepository";
import { createInMemoryStore } from "../helpers/inMemoryStore";

const setup = (seed: Record<string, unknown> = {}) =>
  createSettingsRepository(createInMemoryStore(seed));

describe("reading settings", () => {
  it("returns an empty string for a setting that was never set", async () => {
    const settings = setup();

    expect(await settings.selectSetting("username")).toBe("");
    expect(await settings.selectSetting("replayDirectory")).toBe("");
  });

  it("returns a stored setting", async () => {
    const settings = setup({ replayDirectory: "C:/Slippi" });

    expect(await settings.selectSetting("replayDirectory")).toBe("C:/Slippi");
  });

  it("reads both settings at once", async () => {
    const settings = setup({
      replayDirectory: "C:/Slippi",
      username: "USER#001",
    });

    expect(await settings.selectAllSettings()).toEqual({
      replayDirectory: "C:/Slippi",
      username: "USER#001",
    });
  });
});

describe("writing settings", () => {
  it("stores a value that can be read back", async () => {
    const settings = setup();

    await settings.upsertSetting("username", "USER#001");

    expect(await settings.selectSetting("username")).toBe("USER#001");
  });

  it("overwrites an existing value", async () => {
    const settings = setup({ username: "OLD#000" });

    await settings.upsertSetting("username", "NEW#111");

    expect(await settings.selectSetting("username")).toBe("NEW#111");
  });

  it("writes several settings in one call", async () => {
    const settings = setup();

    await settings.upsertSettings([
      { key: "username", value: "USER#001" },
      { key: "replayDirectory", value: "C:/Slippi" },
    ]);

    expect(await settings.selectAllSettings()).toEqual({
      username: "USER#001",
      replayDirectory: "C:/Slippi",
    });
  });
});

describe("the replay schema backfill", () => {
  it("is outstanding for a library imported before the version was recorded", async () => {
    const settings = setup({ replayDirectory: "C:/Slippi" });

    expect(await settings.needsReplayBackfill()).toBe(true);
  });

  it("is outstanding for a library written by an older schema", async () => {
    const settings = setup({
      schemaVersion: String(REPLAY_SCHEMA_VERSION - 1),
    });

    expect(await settings.needsReplayBackfill()).toBe(true);
  });

  it("is not outstanding once it has been marked done", async () => {
    const settings = setup();

    await settings.markReplayBackfillDone();

    expect(await settings.needsReplayBackfill()).toBe(false);
    expect(await settings.selectSetting("schemaVersion")).toBe(
      String(REPLAY_SCHEMA_VERSION),
    );
  });

  it("is not outstanding for a library already at the current schema", async () => {
    const settings = setup({ schemaVersion: String(REPLAY_SCHEMA_VERSION) });

    expect(await settings.needsReplayBackfill()).toBe(false);
  });
});
