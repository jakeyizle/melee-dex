import { describe, it, expect } from "vitest";
import {
  buildStats,
  applyReplayToStats,
  createEmptyFullStats,
  getModeStat,
} from "@/utils/statUtils";
import { makeReplay, makeMatch, makePlayer, USER, OPPONENT } from "../helpers/makeReplay";

const THIRD_PLAYER = "THRD#003";

describe("buildStats — overall record", () => {
  it("counts wins, losses and totals across a mixed set of games", () => {
    const stats = buildStats(
      [
        makeMatch({ isWin: true }),
        makeMatch({ isWin: true }),
        makeMatch({ isWin: false }),
      ],
      USER,
    );

    expect(stats.stats.overallStat).toMatchObject({
      totalCount: 3,
      winCount: 2,
      lossCount: 1,
    });
  });

  it("reports win rate as a percentage rounded to one decimal place", () => {
    const stats = buildStats(
      [
        makeMatch({ isWin: true }),
        makeMatch({ isWin: false }),
        makeMatch({ isWin: false }),
      ],
      USER,
    );

    expect(stats.stats.overallStat.winRate).toBe(33.3);
  });

  it("is empty for no replays", () => {
    const stats = buildStats([], USER);

    expect(stats.stats.overallStat).toEqual({
      totalCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
    });
    expect(stats.opponentSpecificStats).toEqual([]);
  });
});

describe("buildStats — bucketing", () => {
  it("keeps a separate record per stage", () => {
    const stats = buildStats(
      [
        makeMatch({ stageId: "31", isWin: true }),
        makeMatch({ stageId: "31", isWin: false }),
        makeMatch({ stageId: "2", isWin: true }),
      ],
      USER,
    );

    const battlefield = stats.stats.stageStats.find((s) => s.stageId === "31");
    const fd = stats.stats.stageStats.find((s) => s.stageId === "2");

    expect(stats.stats.stageStats).toHaveLength(2);
    expect(battlefield).toMatchObject({ totalCount: 2, winCount: 1, lossCount: 1 });
    expect(fd).toMatchObject({ totalCount: 1, winCount: 1, lossCount: 0 });
  });

  it("keeps a separate record per character matchup", () => {
    const stats = buildStats(
      [
        makeMatch({ userCharacterId: "0", opponentCharacterId: "9" }),
        makeMatch({ userCharacterId: "0", opponentCharacterId: "9" }),
        makeMatch({ userCharacterId: "2", opponentCharacterId: "9" }),
      ],
      USER,
    );

    expect(stats.stats.matchupStats).toHaveLength(2);
    expect(
      stats.stats.matchupStats.find(
        (m) => m.userCharacterId === "0" && m.opponentCharacterId === "9",
      ),
    ).toMatchObject({ totalCount: 2 });
    expect(
      stats.stats.matchupStats.find(
        (m) => m.userCharacterId === "2" && m.opponentCharacterId === "9",
      ),
    ).toMatchObject({ totalCount: 1 });
  });

  it("treats the same matchup on different stages as different records", () => {
    const stats = buildStats(
      [
        makeMatch({ userCharacterId: "0", opponentCharacterId: "9", stageId: "31" }),
        makeMatch({ userCharacterId: "0", opponentCharacterId: "9", stageId: "2" }),
      ],
      USER,
    );

    expect(stats.stats.matchupStats).toHaveLength(1);
    expect(stats.stats.matchupStats[0].totalCount).toBe(2);
    expect(stats.stats.matchupAndStageStats).toHaveLength(2);
  });
});

describe("buildStats — per-opponent records", () => {
  it("creates one record per opponent connect code", () => {
    const stats = buildStats(
      [
        makeMatch({ opponent: OPPONENT }),
        makeMatch({ opponent: OPPONENT }),
        makeMatch({ opponent: THIRD_PLAYER }),
      ],
      USER,
    );

    expect(stats.opponentSpecificStats.map((o) => o.opponentConnectCode)).toEqual([
      OPPONENT,
      THIRD_PLAYER,
    ]);
    expect(
      stats.opponentSpecificStats.find((o) => o.opponentConnectCode === OPPONENT)
        ?.overallStat.totalCount,
    ).toBe(2);
  });

  it("keeps one opponent record when that opponent switches character", () => {
    const stats = buildStats(
      [
        makeMatch({ opponentCharacterId: "9" }),
        makeMatch({ opponentCharacterId: "2" }),
      ],
      USER,
    );

    expect(stats.opponentSpecificStats).toHaveLength(1);
    expect(stats.opponentSpecificStats[0].matchupStats).toHaveLength(2);
    expect(stats.opponentSpecificStats[0].overallStat.totalCount).toBe(2);
  });

  it("tracks the earliest and latest date played against an opponent", () => {
    const stats = buildStats(
      [
        makeMatch({ date: "2025-03-01T00:00:00Z" }),
        makeMatch({ date: "2025-01-01T00:00:00Z" }),
        makeMatch({ date: "2025-06-01T00:00:00Z" }),
      ],
      USER,
    );

    expect(stats.opponentSpecificStats[0]).toMatchObject({
      firstMatchDate: "2025-01-01T00:00:00Z",
      lastMatchDate: "2025-06-01T00:00:00Z",
    });
  });
});

describe("buildStats — replays that should not count", () => {
  it("ignores a replay the user did not play in", () => {
    const stats = buildStats(
      [
        makeReplay({
          players: [makePlayer(OPPONENT, "0"), makePlayer(THIRD_PLAYER, "9")],
          winnerConnectCode: OPPONENT,
        }),
      ],
      USER,
    );

    expect(stats.stats.overallStat.totalCount).toBe(0);
    expect(stats.opponentSpecificStats).toEqual([]);
  });

  it("ignores a replay with only one player", () => {
    const stats = buildStats(
      [makeReplay({ players: [makePlayer(USER, "0")] })],
      USER,
    );

    expect(stats.stats.overallStat.totalCount).toBe(0);
  });

  it("ignores a replay where both players share the user's connect code", () => {
    const stats = buildStats(
      [
        makeReplay({
          players: [makePlayer(USER, "0"), makePlayer(USER, "9")],
        }),
      ],
      USER,
    );

    expect(stats.stats.overallStat.totalCount).toBe(0);
  });
});

describe("applyReplayToStats — the live-game path agrees with the batch path", () => {
  it("produces the same stats as rebuilding from scratch", () => {
    const history = [
      makeMatch({ isWin: true, stageId: "31", date: "2025-01-01T00:00:00Z" }),
      makeMatch({ isWin: false, stageId: "2", date: "2025-02-01T00:00:00Z" }),
    ];
    const newGame = makeMatch({
      isWin: true,
      stageId: "31",
      opponentCharacterId: "2",
      date: "2025-03-01T00:00:00Z",
    });

    const incremental = buildStats(history, USER);
    applyReplayToStats(incremental, newGame, USER);

    const rebuilt = buildStats([...history, newGame], USER);

    expect(incremental).toEqual(rebuilt);
  });

  it("returns the stats object it updated", () => {
    const stats = createEmptyFullStats();

    const result = applyReplayToStats(stats, makeMatch({ isWin: true }), USER);

    expect(result).toBe(stats);
    expect(stats.stats.overallStat.totalCount).toBe(1);
  });

  // The store writes whatever comes back into `newStatInfo`, so declining to
  // count a replay must still hand the existing stats back — returning nothing
  // used to blank every card on the dashboard.
  it("returns the stats unchanged for a replay the user is not in", () => {
    const stats = buildStats([makeMatch({ isWin: true })], USER);
    const before = structuredClone(stats);

    const result = applyReplayToStats(
      stats,
      makeReplay({
        players: [makePlayer(OPPONENT, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
      USER,
    );

    expect(result).toBe(stats);
    expect(stats).toEqual(before);
  });

  it("returns the stats unchanged when there is no replay", () => {
    const stats = buildStats([makeMatch({ isWin: true })], USER);
    const before = structuredClone(stats);

    expect(applyReplayToStats(stats, null, USER)).toBe(stats);
    expect(stats).toEqual(before);
  });
});

describe("ranked and unranked", () => {
  it("splits the record by mode and keeps the overall total combined", () => {
    const stats = buildStats(
      [
        makeReplay({ mode: "ranked", winnerConnectCode: USER }),
        makeReplay({ mode: "ranked", winnerConnectCode: OPPONENT }),
        makeReplay({ mode: "unranked", winnerConnectCode: USER }),
      ],
      USER,
    );

    expect(getModeStat(stats.stats, "ranked")).toMatchObject({
      totalCount: 2,
      winCount: 1,
      lossCount: 1,
    });
    expect(getModeStat(stats.stats, "unranked")).toMatchObject({
      totalCount: 1,
      winCount: 1,
      lossCount: 0,
    });
    expect(stats.stats.overallStat.totalCount).toBe(3);
  });

  it("counts a replay stored before the mode field existed as unranked", () => {
    const legacy = makeReplay();
    delete legacy.mode;

    const stats = buildStats([legacy], USER);

    expect(getModeStat(stats.stats, "unranked").totalCount).toBe(1);
    expect(getModeStat(stats.stats, "ranked").totalCount).toBe(0);
  });

  it("splits each opponent's record by mode too", () => {
    const stats = buildStats(
      [
        makeMatch({ isWin: true, opponent: OPPONENT }),
        makeReplay({
          mode: "ranked",
          players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
          winnerConnectCode: OPPONENT,
        }),
      ],
      USER,
    );

    const [opponentStats] = stats.opponentSpecificStats;
    expect(getModeStat(opponentStats, "unranked").winCount).toBe(1);
    expect(getModeStat(opponentStats, "ranked").lossCount).toBe(1);
  });
});

describe("opponent name history", () => {
  const withName = (name: string) =>
    makeReplay({
      players: [makePlayer(USER, "0"), { ...makePlayer(OPPONENT, "9"), name }],
      winnerConnectCode: USER,
    });

  it("keeps every name an opponent has played under, first seen first", () => {
    const stats = buildStats(
      [withName("jakeyizle"), withName("newtag"), withName("jakeyizle")],
      USER,
    );

    expect(stats.opponentSpecificStats[0].knownNames).toEqual([
      "jakeyizle",
      "newtag",
    ]);
  });

  it("ignores replays that carry no display name", () => {
    const stats = buildStats([withName(""), withName("jakeyizle")], USER);

    expect(stats.opponentSpecificStats[0].knownNames).toEqual(["jakeyizle"]);
  });
});
