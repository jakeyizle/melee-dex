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

  const updateUsernameIfEmpty = async (username: string) => {
    const currentUsername = await selectSetting("username");
    if (!currentUsername) upsertSetting("username", username.toUpperCase());
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
