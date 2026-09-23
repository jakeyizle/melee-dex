import { Replay, ReplayPlayer } from "@/db/replayRepository";

export const USER = "USER#001";
export const OPPONENT = "OPPO#002";

let counter = 0;

export const makePlayer = (
  connectCode: string,
  characterId: string,
  name = connectCode.split("#")[0],
): ReplayPlayer => ({ connectCode, name, characterId });

/**
 * A valid two-player Replay. Every test states only the fields it cares about;
 * names are auto-unique so replays don't overwrite each other in a store.
 */
export const makeReplay = (overrides: Partial<Replay> = {}): Replay => {
  counter += 1;
  return {
    name: `Game_${String(counter).padStart(4, "0")}.slp`,
    path: `C:/replays/Game_${String(counter).padStart(4, "0")}.slp`,
    date: "2025-01-01T00:00:00Z",
    stageId: "31",
    players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
    winnerConnectCode: USER,
    // Unranked by default: it is what the overwhelming majority of a real
    // library is, and what a replay with no matchId is classified as.
    mode: "unranked",
    matchId: "",
    gameNumber: 1,
    lastFrame: 7200,
    ...overrides,
  };
};

/** Convenience: a replay between USER (as `userCharacterId`) and OPPONENT. */
export const makeMatch = (args: {
  userCharacterId?: string;
  opponentCharacterId?: string;
  stageId?: string;
  isWin?: boolean;
  date?: string;
  opponent?: string;
}): Replay => {
  const {
    userCharacterId = "0",
    opponentCharacterId = "9",
    stageId = "31",
    isWin = true,
    date = "2025-01-01T00:00:00Z",
    opponent = OPPONENT,
  } = args;
  return makeReplay({
    stageId,
    date,
    players: [
      makePlayer(USER, userCharacterId),
      makePlayer(opponent, opponentCharacterId),
    ],
    winnerConnectCode: isWin ? USER : opponent,
  });
};
