import { KeyValueStore } from "./replayRepository";

export type SETTINGS_KEYS = "replayDirectory" | "username" | "schemaVersion";

/**
 * Bumped whenever `Replay` gains a field that cannot be derived from what is
 * already stored. A library written by an older version is re-imported once, by
 * re-parsing the files still on disk; rows whose files are gone keep their old
 * shape, which is why every added field has to stay optional.
 *
 * 1 — pre-`mode`. 2 — `mode`, `matchId`, `gameNumber`, `lastFrame`.
 */
export const REPLAY_SCHEMA_VERSION = 2;

export const createSettingsRepository = (settingsStore: KeyValueStore) => {
  const selectSetting = async (key: SETTINGS_KEYS): Promise<string> => {
    return (await settingsStore.getItem<string>(key)) || "";
  };

  const selectAllSettings = async () => {
    const replayDirectory = await selectSetting("replayDirectory");
    const username = await selectSetting("username");
    return { replayDirectory, username };
  };

  /**
   * Whether the stored replays predate the current `Replay` shape. A library
   * written before the version was recorded at all reads as 0, which is the
   * pre-`mode` case and does need the re-import.
   */
  const needsReplayBackfill = async () => {
    const stored = Number(await selectSetting("schemaVersion")) || 0;
    return stored < REPLAY_SCHEMA_VERSION;
  };

  /**
   * Stamped only once an import has actually re-read the directory. Writing it
   * on any finished load would mark the backfill done for someone whose replay
   * directory had merely been moved, and they would never get it.
   */
  const markReplayBackfillDone = async () => {
    await upsertSetting("schemaVersion", String(REPLAY_SCHEMA_VERSION));
  };

  const upsertSetting = async (key: SETTINGS_KEYS, value: string) => {
    await settingsStore.setItem(key, value);
  };

  const upsertSettings = async (
    settings: { key: SETTINGS_KEYS; value: string }[],
  ) => {
    for (const setting of settings) {
      await upsertSetting(setting.key, setting.value);
    }
  };

  return {
    selectSetting,
    selectAllSettings,
    upsertSetting,
    upsertSettings,
    needsReplayBackfill,
    markReplayBackfillDone,
  };
};

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
