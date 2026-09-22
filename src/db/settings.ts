import { settingsStore } from "./stores";
import { createSettingsRepository } from "./settingsRepository";

export type { SETTINGS_KEYS } from "./settingsRepository";

// The app-wide instance, bound to the real localforage stores.
// Tests build their own repository over an in-memory store instead.
export const settingsRepository = createSettingsRepository(settingsStore);

export const {
  selectSetting,
  selectAllSettings,
  upsertSetting,
  upsertSettings,
  updateUsernameIfEmpty,
} = settingsRepository;
