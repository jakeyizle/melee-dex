import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SlippiGame } from "@slippi/slippi-js";
import {
  parseGameToReplay,
  tryGetWinner,
  isReplayValid,
  ParseResult,
} from "@/replayParsing";
import { buildStats } from "@/utils/statUtils";
import { Replay } from "@/db/replayRepository";
import { makeReplay, makePlayer } from "../helpers/makeReplay";

/**
 * Integration tests over the real .slp files in testdata/. Expected values were
 * produced by parsing the files once and verifying them by hand; they are the
 * contract the parser must keep meeting.
 */

const TESTDATA = path.resolve(__dirname, "../../testdata");
const OWNER = "JAKE#193";

const parseFile = (name: string): ParseResult => {
  const filePath = path.join(TESTDATA, name);
  return parseGameToReplay(new SlippiGame(filePath), { name, path: filePath });
};

const parseOk = (name: string): Replay => {
  const result = parseFile(name);
  if (!result.ok) {
    throw new Error(`expected ${name} to parse, got "${result.reason}"`);
  }
  return result.replay;
};

describe("parsing real replays", () => {
  it("reads players, characters, stage and date from a 2020 replay", () => {
    const replay = parseOk("Game_20200727T230003.slp");

    expect(replay).toMatchObject({
      name: "Game_20200727T230003.slp",
      date: "2020-07-28T03:00:08Z",
      stageId: "3",
      winnerConnectCode: "JAKE#193",
    });
    expect(replay.players).toEqual([
      { connectCode: "JAKE#193", name: "jakeyizle", characterId: "19" },
      { connectCode: "HYRU#485", name: "Hyruler", characterId: "19" },
    ]);
  });

  it("reads a 2025 replay in which the second player won", () => {
    const replay = parseOk("Game_20250505T223105.slp");

    expect(replay).toMatchObject({
      date: "2025-05-06T02:31:03Z",
      stageId: "8",
      winnerConnectCode: "KENJ#707",
    });
    expect(replay.players.map((p) => p.connectCode)).toEqual([
      "JAKE#193",
      "KENJ#707",
    ]);
  });

  it("records character ids as strings, not numbers", () => {
    const replay = parseOk("Game_20250417T230155.slp");

    expect(replay.players.map((p) => p.characterId)).toEqual(["13", "19"]);
    expect(replay.stageId).toBe("28");
    replay.players.forEach((p) => expect(typeof p.characterId).toBe("string"));
    expect(typeof replay.stageId).toBe("string");
  });

  it("always names one of the two players as the winner", () => {
    const names = fs
      .readdirSync(TESTDATA)
      .filter((f) => f.endsWith(".slp") && f !== "Game_20250422T214211.slp");

    for (const name of names) {
      const replay = parseOk(name);
      expect(replay.players.map((p) => p.connectCode)).toContain(
        replay.winnerConnectCode,
      );
    }
  });
});

describe("rejecting replays", () => {
  it("rejects a game that ended almost immediately", () => {
    // 24 frames — well under the 30-second (1800 frame) floor.
    expect(parseFile("Game_20250422T214211.slp")).toEqual({
      ok: false,
      reason: "too-short",
    });
  });

  it("rejects a file that is not a replay at all", () => {
    expect(() => parseOk("../package.json")).toThrow();
  });
});

describe("tryGetWinner", () => {
  it("passes through the winner the replay already declares", () => {
    const game = new SlippiGame(
      path.join(TESTDATA, "Game_20250505T223105.slp"),
    );

    expect(game.getWinners()).toHaveLength(1);
    expect(tryGetWinner(game)).toEqual(game.getWinners());
  });

  it("infers the winner from stocks lost when the replay declares none", () => {
    // This 2020 replay has no recorded winner; the loser is whoever lost more stocks.
    const game = new SlippiGame(
      path.join(TESTDATA, "Game_20200727T230003.slp"),
    );

    expect(game.getWinners()).toEqual([]);
    expect(tryGetWinner(game)).toEqual([{ playerIndex: 0, position: 0 }]);
  });

  it("infers the second player as winner when the first lost more stocks", () => {
    const game = new SlippiGame(
      path.join(TESTDATA, "Game_20200729T230153.slp"),
    );

    expect(game.getWinners()).toEqual([]);
    expect(tryGetWinner(game)).toEqual([{ playerIndex: 1, position: 0 }]);
  });

  // BUG (see src/CLAUDE.md "Known behavior quirks" #7): equal stock counts yield
  // no winner at all, so such a replay is filed as bad and silently never counted.
  it("returns no winner when both players lost the same number of stocks", () => {
    const tiedGame = {
      getWinners: () => [],
      getStats: () => ({
        stocks: [
          { playerIndex: 0, endFrame: 100 },
          { playerIndex: 1, endFrame: 200 },
        ],
      }),
    } as unknown as SlippiGame;

    expect(tryGetWinner(tiedGame)).toEqual([]);
  });
});

describe("isReplayValid", () => {
  const required: { field: string; replay: Replay }[] = [
    { field: "name", replay: makeReplay({ name: "" }) },
    { field: "path", replay: makeReplay({ path: "" }) },
    { field: "date", replay: makeReplay({ date: "" }) },
    { field: "stageId", replay: makeReplay({ stageId: "" }) },
    { field: "winnerConnectCode", replay: makeReplay({ winnerConnectCode: "" }) },
    {
      field: "player one connect code",
      replay: makeReplay({
        players: [makePlayer("", "0"), makePlayer("OPPO#002", "9")],
      }),
    },
    {
      field: "player two connect code",
      replay: makeReplay({
        players: [makePlayer("USER#001", "0"), makePlayer("", "9")],
      }),
    },
    {
      field: "player one character",
      replay: makeReplay({
        players: [makePlayer("USER#001", ""), makePlayer("OPPO#002", "9")],
      }),
    },
    {
      field: "player two character",
      replay: makeReplay({
        players: [makePlayer("USER#001", "0"), makePlayer("OPPO#002", "")],
      }),
    },
  ];

  it("accepts a fully populated two-player replay", () => {
    expect(isReplayValid(makeReplay())).toBe(true);
  });

  required.forEach(({ field, replay }) => {
    it(`rejects a replay missing its ${field}`, () => {
      expect(isReplayValid(replay)).toBe(false);
    });
  });

  // Was quirk #8: this threw rather than returning false, because it read
  // players[1] after the length check had already failed. The outcome in
  // production was the same — the worker's try/catch filed the replay as bad —
  // but only by accident.
  it("rejects a replay with one player", () => {
    const onePlayer = makeReplay({ players: [makePlayer("USER#001", "0")] });

    expect(isReplayValid(onePlayer)).toBe(false);
  });

  it("rejects a replay with no players at all", () => {
    expect(isReplayValid(makeReplay({ players: [] }))).toBe(false);
  });
});

describe("stats built from the real replay library", () => {
  it("summarises the owner's record across every valid replay in testdata", () => {
    // Mirrors the production file walk, which only picks up *.slp
    // (so Game_20220901T221616.slp.old is excluded, as it would be in the app).
    const replays = fs
      .readdirSync(TESTDATA)
      .filter((f) => f.endsWith(".slp"))
      .map(parseFile)
      .filter((r): r is { ok: true; replay: Replay } => r.ok)
      .map((r) => r.replay);

    expect(replays).toHaveLength(6);

    const stats = buildStats(replays, OWNER);

    expect(stats.stats.overallStat).toEqual({
      totalCount: 6,
      winCount: 4,
      lossCount: 2,
      winRate: 66.7,
    });

    // Six different opponents, one game against each.
    expect(
      stats.opponentSpecificStats.map((o) => o.opponentConnectCode).sort(),
    ).toEqual([
      "CHTR#448",
      "CUNT#279",
      "HYRU#485",
      "KENJ#707",
      "SHKN#614",
      "YEYO#234",
    ]);
    stats.opponentSpecificStats.forEach((o) =>
      expect(o.overallStat.totalCount).toBe(1),
    );

    const stageCounts = Object.fromEntries(
      stats.stats.stageStats.map((s) => [s.stageId, s.totalCount]),
    );
    expect(stageCounts).toEqual({ "3": 3, "8": 2, "28": 1 });
  });
});
