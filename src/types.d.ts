export type LiveReplayPlayers = {
  connectCode: string,
  name: string,
  characterId: string
}

export type CurrentReplayInfo = {
  players: LiveReplayPlayers[],
  stageId: string,
}