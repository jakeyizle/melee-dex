import { ipcRenderer } from "electron";
import { SlippiGame } from "@slippi/slippi-js";
import { ReplayPlayer, Replay, insertReplay, insertBadReplay } from "./db/replays";

ipcRenderer.on('start-load', async (event, args) => {
    const files = args.files
    try {
        for (const file of files) {
            try {
            const game = new SlippiGame(file.path)
            const metadata = game.getMetadata()
            const settings = game.getSettings()
            const winners = game.getWinners()

            if (!settings?.players || !metadata?.startAt || winners.length === 0) {
                await insertBadReplay({name: file.name, path: file.path})
                continue
            }
            const playerOne: ReplayPlayer = {
                connectCode: settings.players[0].connectCode,
                name: settings.players[0].displayName,
                characterId: (settings.players[0].characterId || 0).toString()
            }

            const playerTwo: ReplayPlayer = {
                connectCode: settings.players[1].connectCode,
                name: settings.players[1].displayName,
                characterId: (settings.players[1].characterId || 0).toString()
            }

            const stageId = settings.stageId

            const winnerIndex =winners[0].playerIndex
            const winnerCode = settings.players[winnerIndex].connectCode
            const replay: Replay = {
                name: file.name,
                path: file.path,
                date: metadata.startAt,
                players: [playerOne, playerTwo],
                winnerConnectCode: winnerCode,
                stageId: stageId?.toString() || '',
        }
        if (isReplayValid(replay)) {            
            await insertReplay(replay)
        } else {
            await insertBadReplay({name: file.name, path: file.path})
        }        
    }
 catch (e) { console.error(e) } 
 finally {
    ipcRenderer.invoke('replay-loaded')
 }
}
    } catch (e) { console.error(e) }
     finally {
        ipcRenderer.invoke('worker-finished')        
    }
})

const isReplayValid = (replay: Replay) => {
    let isValid = true
    if (replay.name === '') isValid = false
    if (replay.path === '') isValid = false
    if (replay.date === '') isValid = false
    if (replay.players.length !== 2) isValid = false
    if (replay.winnerConnectCode === '') isValid = false
    if (replay.players[0].connectCode === '') isValid = false
    if (replay.players[0].name === '') isValid = false
    if (replay.players[0].characterId === '') isValid = false
    if (replay.players[1].connectCode === '') isValid = false
    if (replay.players[1].name === '') isValid = false
    if (replay.players[1].characterId === '') isValid = false
    if (replay.stageId === '') isValid = false
    return isValid
}