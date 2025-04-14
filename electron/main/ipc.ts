import { ipcMain, dialog, } from "electron";
import { createInvisWindow, getReplayFiles, listenForReplayFile, mainWindow, stopListeningForReplayFile } from "./utils";


ipcMain.handle('select-directory', async (event, arg) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
      return null        
    } else {
        if (!filePaths[0]) return null
        return filePaths[0];
    }
})

let isLoadingReplays = false;
let totalReplaysToLoad = 0;
let currentReplaysLoaded = 0;
let totalReplays = 0;
ipcMain.handle('begin-loading-replays', async (_event, args: { replayDirectory: string | undefined, existingReplayNames: string[], isFastLoad: boolean}) => {
    const { replayDirectory, existingReplayNames, isFastLoad} = args;
    if (!replayDirectory) return;
    if (isLoadingReplays) return;
    isLoadingReplays = true;

    const replays = await getReplayFiles(replayDirectory);
    const newReplays = replays.filter(replay => !existingReplayNames.includes(replay.name));

    totalReplays = replays.length;
    if (newReplays.length === 0) {
        isLoadingReplays = false;
        mainWindow?.webContents.send('end-loading-replays', {totalReplays});
        return;
    }

    totalReplaysToLoad = newReplays.length;
    currentReplaysLoaded = 0;
    mainWindow?.webContents.send('update-replay-load-progress', { totalReplaysToLoad, currentReplaysLoaded });
    createInvisWindow(newReplays);
})

ipcMain.handle('worker-finished', (event) => {
    const worker = event.sender;    
    worker.close();
    isLoadingReplays = false;
    mainWindow?.webContents.send('end-loading-replays', {totalReplays});
})

ipcMain.handle('replay-loaded', (event) => {
    currentReplaysLoaded++;
    mainWindow?.webContents.send('update-replay-load-progress', { totalReplaysToLoad, currentReplaysLoaded });
})

ipcMain.handle('listen-for-new-replays', (event, args) => {
    const { replayDirectory } = args;
    console.log('listen-for-new-replays', replayDirectory);
    if (!replayDirectory) return;
    listenForReplayFile(replayDirectory);
})

ipcMain.handle('stop-listening-for-new-replays', () => {
    stopListeningForReplayFile();
})