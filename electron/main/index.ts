import { app, BrowserWindow } from "electron";
import os from "node:os";
import { createMainWindow, destroyMainWindow, mainWindow } from "./utils";
import electronUpdater, { type AppUpdater } from "electron-updater";
import log from "electron-log";
import "./ipc";

export function getAutoUpdater(): AppUpdater {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater;
  return autoUpdater;
}
const autoUpdater = getAutoUpdater();
autoUpdater.logger = log;
log.transports.file.level = "info";
autoUpdater.checkForUpdatesAndNotify();

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.whenReady().then(() => {
  createMainWindow();
});

app.on("window-all-closed", () => {
  destroyMainWindow();
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (mainWindow) {
    // Focus on the main window if the user tried to open another
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createMainWindow();
  }
});
