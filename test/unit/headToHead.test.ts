import { describe, it, expect } from "vitest";
import { buildStats, getCurrentHeadToHeadStats } from "@/utils/statUtils";
import { makeMatch, USER, OPPONENT } from "../helpers/makeReplay";
import { CurrentReplayInfo } from "@/types";

const THIRD_PLAYER = "THRD#003";

const liveGame = (args: {
  userCharacterId?: string;
  opponentCharacterId?: string;
  stageId?: string;
  players?: CurrentReplayInfo["players"];
}): CurrentReplayInfo => ({
  stageId: args.stageId ?? "31",
  players: args.players ?? [
    {
      connectCode: USER,
      name: "USER",
      characterId: args.userCharacterId ?? "0",
    },
    {
      connectCode: OPPONENT,
      name: "OPPO",
      characterId: args.opponentCharacterId ?? "9",
    },
  ],
});

describe("getCurrentHeadToHeadStats — when it declines to report", () => {
  it("returns null when the user is not in the live game", () => {
    const stats = buildStats([makeMatch({})], USER);

    const result = getCurrentHeadToHeadStats(
      stats,
      liveGame({
        players: [
          { connectCode: OPPONENT, name: "OPPO", characterId: "9" },
          { connectCode: THIRD_PLAYER, name: "THRD", characterId: "2" },
        ],
      }),
      USER,
    );

    // No player matches the user's code, so there is no "user" perspective to report from.
    expect(result).toBeNull();
  });

  it("returns null when the live game has no distinct opponent", () => {
    const stats = buildStats([makeMatch({})], USER);

    const result = getCurrentHeadToHeadStats(
      stats,
      liveGame({
        players: [
          { connectCode: USER, name: "USER", characterId: "0" },
          { connectCode: USER, name: "USER", characterId: "9" },
        ],
      }),
      USER,
    );

    expect(result).toBeNull();
  });

  it("returns null when this opponent has never been played before", () => {
    const stats = buildStats([makeMatch({ opponent: THIRD_PLAYER })], USER);

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    expect(result).toBeNull();
  });
});

describe("getCurrentHeadToHeadStats — the reported record", () => {
  it("reports the record against this specific opponent, not the overall record", () => {
    const stats = buildStats(
      [
        makeMatch({ opponent: OPPONENT, isWin: true }),
        makeMatch({ opponent: OPPONENT, isWin: false }),
        makeMatch({ opponent: THIRD_PLAYER, isWin: true }),
        makeMatch({ opponent: THIRD_PLAYER, isWin: true }),
      ],
      USER,
    );

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    expect(result?.opponentStats.opponentConnectCode).toBe(OPPONENT);
    expect(result?.opponentStats.overallStat).toMatchObject({
      totalCount: 2,
      winCount: 1,
      lossCount: 1,
      winRate: 50,
    });
  });

  it("counts how often the user played each character against this opponent", () => {
    const stats = buildStats(
      [
        makeMatch({ userCharacterId: "0" }),
        makeMatch({ userCharacterId: "0" }),
        makeMatch({ userCharacterId: "2" }),
      ],
      USER,
    );

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    const falcon = result?.userCharacterUsages.find(
      (u) => u.characterId === "0",
    );
    const fox = result?.userCharacterUsages.find((u) => u.characterId === "2");

    expect(falcon).toMatchObject({ playCount: 2 });
    expect(fox).toMatchObject({ playCount: 1 });
  });

  it("expresses user character usage as a percentage of games against this opponent", () => {
    const stats = buildStats(
      [
        makeMatch({ userCharacterId: "0" }),
        makeMatch({ userCharacterId: "0" }),
        makeMatch({ userCharacterId: "0" }),
        makeMatch({ userCharacterId: "2" }),
      ],
      USER,
    );

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    expect(
      result?.userCharacterUsages.find((u) => u.characterId === "0")?.playRate,
    ).toBe(75);
    expect(
      result?.userCharacterUsages.find((u) => u.characterId === "2")?.playRate,
    ).toBe(25);
  });

  it("counts how often the opponent played each character", () => {
    const stats = buildStats(
      [
        makeMatch({ opponentCharacterId: "9" }),
        makeMatch({ opponentCharacterId: "9" }),
        makeMatch({ opponentCharacterId: "2" }),
      ],
      USER,
    );

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    expect(
      result?.opponentCharacterUsages.find((u) => u.characterId === "9")
        ?.playCount,
    ).toBe(2);
    expect(
      result?.opponentCharacterUsages.find((u) => u.characterId === "2")
        ?.playCount,
    ).toBe(1);
  });

  // A character appears in one matchup row per character it faced, so its usage
  // has to be totalled across them rather than accumulated per row.
  it("counts an opponent character once when it recurs across matchups", () => {
    // Two matchup rows both carry opponent character "9": (user 0 vs 9) and (user 2 vs 9).
    const stats = buildStats(
      [
        makeMatch({ userCharacterId: "0", opponentCharacterId: "9" }),
        makeMatch({ userCharacterId: "2", opponentCharacterId: "9" }),
      ],
      USER,
    );

    const result = getCurrentHeadToHeadStats(stats, liveGame({}), USER);

    const opponentFox = result?.opponentCharacterUsages.find(
      (u) => u.characterId === "9",
    );

    // The opponent played "9" in 2 of 2 games.
    expect(opponentFox?.playCount).toBe(2);
    expect(opponentFox?.playRate).toBe(100);
  });
});
