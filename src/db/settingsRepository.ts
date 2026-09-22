import { KeyValueStore } from "./replayRepository";

export type SETTINGS_KEYS = "replayDirectory" | "username";

export const createSettingsRepository = (settingsStore: KeyValueStore) => {
  const selectSetting = async (key: SETTINGS_KEYS): Promise<string> => {
    return (await settingsStore.getItem<string>(key)) || "";
  };

  const selectAllSettings = async () => {
    const replayDirectory = await selectSetting("replayDirectory");
    const username = await selectSetting("username");
    return { replayDirectory, username };
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

  /**
   * Returns the configured username, working one out only if there isn't one.
   *
   * `suggestUsername` is a thunk on purpose: the only suggestion the app has is
   * `getMostCommonUser`, which reads every replay in the library. Passing its
   * result in meant paying for that scan on every launch to then discard it.
   */
  const updateUsernameIfEmpty = async (
    suggestUsername: () => Promise<string>,
  ) => {
    const currentUsername = await selectSetting("username");
    if (currentUsername) return currentUsername;

    // Empty when nothing in the library identifies the user yet — a first run
    // over a directory with no valid replays.
    const username = await suggestUsername();
    if (username) await upsertSetting("username", username.toUpperCase());

    return await selectSetting("username");
  };

  return {
    selectSetting,
    selectAllSettings,
    upsertSetting,
    upsertSettings,
    updateUsernameIfEmpty,
  };
};

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
