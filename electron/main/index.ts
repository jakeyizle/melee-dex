import { app, BrowserWindow } from "electron";
import os from "node:os";
import { createMainWindow, destroyMainWindow, mainWindow } from "./utils";
import "./ipc";

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Must match `appId` in electron-builder.json. The installer registers the
// shortcut under that id, and Windows groups taskbar windows and routes
// notifications by it — claiming a different one here makes the running app and
// its own shortcut look like two separate applications.
if (process.platform === "win32") app.setAppUserModelId("com.meleedex.app");

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
