import { describe, it, expect } from "vitest";
import { createSettingsRepository } from "@/db/settingsRepository";
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
    const settings = setup({ replayDirectory: "C:/Slippi", username: "USER#001" });

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

describe("updateUsernameIfEmpty", () => {
  it("stores the suggested username, uppercased, when none is set", async () => {
    const settings = setup();

    const result = await settings.updateUsernameIfEmpty(async () => "user#001");

    expect(result).toBe("USER#001");
    expect(await settings.selectSetting("username")).toBe("USER#001");
  });

  it("leaves an already-configured username alone", async () => {
    const settings = setup({ username: "MINE#123" });

    const result = await settings.updateUsernameIfEmpty(async () => "OTHER#999");

    expect(result).toBe("MINE#123");
  });

  // Working out a username reads the whole replay library, so it must not
  // happen at all when one is already configured.
  it("does not ask for a suggestion when a username is already set", async () => {
    const settings = setup({ username: "MINE#123" });
    let asked = false;

    await settings.updateUsernameIfEmpty(async () => {
      asked = true;
      return "OTHER#999";
    });

    expect(asked).toBe(false);
  });

  // Nothing in the library identifies the user yet — a first run over a
  // directory with no valid replays. This used to throw on .toUpperCase().
  it("stores nothing when there is no username to suggest", async () => {
    const settings = setup();

    const result = await settings.updateUsernameIfEmpty(async () => "");

    expect(result).toBe("");
    expect(await settings.selectSetting("username")).toBe("");
  });
});
