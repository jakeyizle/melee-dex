import { BrowserWindow, app, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import {
  WORKER_URL,
  WORKER_HTML,
  PRELOAD,
  VITE_DEV_SERVER_URL,
  INDEX_HTML,
} from "./vite_constants";
import { ReplayLoadManager } from "./replayLoadManager";
import path from "node:path";
import { update } from "./update";
import { require } from "./vite_constants";
const { SlippiGame } = require("@slippi/slippi-js");

const NUM_CORES = os.cpus().length;
type ReplayFile = { path: string; name: string };

export let mainWindow: BrowserWindow | null = null;
const replayLoadManager = ReplayLoadManager.getInstance();

async function getFiles(path = "./") {
  // add "/" to the end of path if not present
  if (path[path.length - 1] !== "/") {
    path += "/";
  }
  const entries = fs.readdirSync(path, {
    withFileTypes: true,
  });
  // Get files within the current directory and add a path key to the file objects
  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => ({
      ...file,
      path: path + file.name,
    }));

  // Get folders within the current directory
  const folders = entries.filter((folder) => folder.isDirectory());
  /*
        Add the found files within the subdirectory to the files array by calling the
        current function itself
      */
  for (const folder of folders)
    files.push(...(await getFiles(`${path}${folder.name}/`)));

  return files;
}

export async function getReplayFiles(path: string | undefined) {
  let files = await getFiles(path);
  //ends in .slp
  let regExp = /.*\.slp$/;
  let replays = files.filter((file) => regExp.test(file.name));
  return replays;
}

export const getNumberOfRenderers = (
  numberOfReplays: number,
  isFastLoad: boolean,
) => {
  const maxRenderers = isFastLoad ? NUM_CORES * 2 : 1;
  const numRenderers =
    numberOfReplays < maxRenderers ? numberOfReplays : maxRenderers;
  return numRenderers;
};

export const createInvisWindow = (files: ReplayFile[]) => {
  let invisWindow = new BrowserWindow({
    show: !app.isPackaged,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (WORKER_URL) {
    invisWindow.loadURL(WORKER_URL);
    //react dev tools does not appreciate other windows having dev tools open
    invisWindow.webContents.openDevTools();
  } else {
    invisWindow.loadFile(WORKER_HTML);
  }

  invisWindow.webContents.once("did-finish-load", () => {
    invisWindow.webContents.send("start-load", { files: files });
  });

  return invisWindow;
};

export const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload: PRELOAD,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(INDEX_HTML);
  }

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send(
      "main-process-message",
      new Date().toLocaleString(),
    );
  });

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto update
  update(mainWindow);

  mainWindow.on("close", () => {
    app.quit();
  });
};

export const destroyMainWindow = () => {
  mainWindow = null;
};

// we listen in the directory and all subdirectories
// look for .slp file to be changing
// try to extract player data
let watcher: fs.FSWatcher;
export const listenForReplayFile = (directory: string) => {
  watcher?.close();
  watcher = fs.watch(directory, { recursive: true }, (event, filename) => {
    console.log("event, filename", event, filename);
    if (filename) {
      try {
        const filePath = path.join(directory, filename);
        const game = new SlippiGame(filePath);

        const winners = game.getWinners();
        if (winners.length > 0) {
          const path = directory + "/" + filename;
          // filename can sometimes include subdirectories of directory
          // but just want the actual file name
          const name = filename.split("/").pop() || filename;
          replayLoadManager.beginLoadingReplayFile({ path, name });
          return;
        }

        const settings = game.getSettings();
        const players = settings?.players.map((player: any) => {
          return {
            connectCode: player.connectCode,
            name: player.displayName,
            characterId: (player.characterId || 0).toString(),
          };
        });
        const stageId = settings.stageId;
        mainWindow?.webContents.send("new-game", {
          filename,
          players,
          stageId,
        });
      } catch (_e) {}
    }
  });
};

export const stopListeningForReplayFile = () => {
  watcher?.close();
};
