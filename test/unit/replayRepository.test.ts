import { describe, it, expect } from "vitest";
import {
  createReplayRepository,
  LATEST_REPLAY_KEY,
  Replay,
} from "@/db/replayRepository";
import { createSettingsRepository } from "@/db/settingsRepository";
import { createInMemoryStore } from "../helpers/inMemoryStore";
import {
  makeReplay,
  makeMatch,
  makePlayer,
  USER,
  OPPONENT,
} from "../helpers/makeReplay";

const THIRD_PLAYER = "THRD#003";

const setup = (seed: { replays?: Replay[]; username?: string } = {}) => {
  const replaysStore = createInMemoryStore();
  const badReplaysStore = createInMemoryStore();
  const settingsStore = createInMemoryStore(
    seed.username ? { username: seed.username } : {},
  );
  const settings = createSettingsRepository(settingsStore);
  const repo = createReplayRepository(
    { replaysStore, badReplaysStore },
    settings,
  );
  return { repo, settings, replaysStore, badReplaysStore, settingsStore };
};

const seedReplays = async (
  repo: ReturnType<typeof setup>["repo"],
  replays: Replay[],
) => {
  for (const replay of replays) await repo.insertReplays([replay]);
};

describe("storing and retrieving replays", () => {
  it("stores every replay in a batch under its filename", async () => {
    const { repo } = setup();
    const first = makeReplay({ name: "Game_A.slp" });
    const second = makeReplay({ name: "Game_B.slp" });
    const third = makeReplay({ name: "Game_C.slp" });

    await repo.insertReplays([first, second, third]);

    expect(await repo.selectReplay("Game_A.slp")).toEqual(first);
    expect(await repo.selectReplay("Game_B.slp")).toEqual(second);
    expect(await repo.selectReplay("Game_C.slp")).toEqual(third);
  });

  it("writes nothing at all for an empty batch", async () => {
    const { repo, replaysStore } = setup();

    await repo.insertReplays([]);

    expect(await replaysStore.length()).toBe(0);
  });

  it("reads back a replay by name", async () => {
    const { repo } = setup();
    const replay = makeReplay({ name: "Game_A.slp" });
    await repo.insertReplays([replay]);

    expect(await repo.selectReplay("Game_A.slp")).toEqual(replay);
  });

  it("has no replay under a name that was never stored", async () => {
    const { repo } = setup();

    expect(await repo.selectReplay("Game_Missing.slp")).toBeNull();
  });

  it("lists the names of both good and rejected replays", async () => {
    const { repo } = setup();
    await repo.insertReplays([makeReplay({ name: "Good.slp" })]);
    await repo.insertBadReplays([{ name: "Bad.slp", path: "C:/r/Bad.slp" }]);

    const names = await repo.selectAllReplayNames();

    expect(names).toContain("Good.slp");
    expect(names).toContain("Bad.slp");
  });

  it("counts rejected replays separately", async () => {
    const { repo } = setup();
    await repo.insertBadReplays([
      { name: "Bad1.slp", path: "C:/r/Bad1.slp" },
      { name: "Bad2.slp", path: "C:/r/Bad2.slp" },
    ]);

    expect(await repo.selectBadReplayCount()).toBe(2);
  });

  it("counts exactly the replays that were stored", async () => {
    const { repo } = setup();
    await seedReplays(repo, [makeReplay(), makeReplay()]);

    expect(await repo.selectReplayCount()).toBe(2);
  });

  // The store holds replays and nothing else, so consumers do not have to
  // defend against non-replay values.
  it("yields only replays to callers iterating the store", async () => {
    const { repo } = setup();
    const replay = makeReplay({ name: "Game_A.slp" });
    await seedReplays(repo, [replay]);

    const seen: unknown[] = [];
    // The callback must not return a value: localforage (and the in-memory fake)
    // treat a non-undefined return as an early exit from the iteration.
    await repo.executeCallbackOnEachReplay((r) => {
      seen.push(r);
    });

    expect(seen).toEqual([replay]);
  });
});

describe("working out who the user is", () => {
  it("picks whichever candidate appears in more stored replays", async () => {
    const { repo } = setup();
    // USER in 3, OPPONENT in 1. The counts have to actually differ for this to
    // be testing what it says — with one replay each they tie, and the answer
    // comes from the tie-break below instead.
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.getMostCommonUser([OPPONENT, USER])).toBe(USER);
    expect(await repo.getMostCommonUser([USER, OPPONENT])).toBe(USER);
  });

  it("falls back to the most frequent player overall when neither candidate is known", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.getMostCommonUser(["NONE#000", "ALSO#000"])).toBe(USER);
  });

  // Candidates arrive in the live game's port order, so a tie must not be
  // broken by position — it would make the answer depend on the port used.
  it("returns the first candidate when both appear equally often", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
    ]);

    expect(await repo.getMostCommonUser([USER, OPPONENT])).toBe(USER);
    // Same two players, opposite port order.
    expect(await repo.getMostCommonUser([OPPONENT, USER])).toBe(OPPONENT);
  });

  it("returns no user at all when there are no replays", async () => {
    const { repo } = setup();

    expect(await repo.getMostCommonUser([])).toBe("");
  });
});

describe("selectBadReplayReasons", () => {
  it("counts the rejections by reason, commonest first", async () => {
    const { repo } = setup();
    await repo.insertBadReplays([
      { name: "a.slp", path: "C:/a.slp", reason: "too-short" },
      { name: "b.slp", path: "C:/b.slp", reason: "too-short" },
      { name: "c.slp", path: "C:/c.slp", reason: "not-two-human-players" },
    ]);

    expect(await repo.selectBadReplayReasons()).toEqual([
      { reason: "too-short", count: 2 },
      { reason: "not-two-human-players", count: 1 },
    ]);
  });

  // Older versions stored the path alone, as a bare string. Those rows still
  // count toward the total, so they have to be counted here too or the
  // breakdown silently fails to add up.
  it("counts rows written before the reason was recorded", async () => {
    const { repo, badReplaysStore } = setup();
    await badReplaysStore.setItem("legacy.slp", "C:/legacy.slp");
    await repo.insertBadReplays([
      { name: "new.slp", path: "C:/new.slp", reason: "too-short" },
    ]);

    const reasons = await repo.selectBadReplayReasons();

    expect(reasons).toContainEqual({ reason: "unknown", count: 1 });
    expect(reasons.reduce((total, row) => total + row.count, 0)).toBe(
      await repo.selectBadReplayCount(),
    );
  });

  it("returns nothing when nothing was rejected", async () => {
    const { repo } = setup();

    expect(await repo.selectBadReplayReasons()).toEqual([]);
  });
});

describe("deleteAllReplays", () => {
  it("empties both the accepted and the rejected replays", async () => {
    const { repo } = setup();
    await seedReplays(repo, [makeMatch({ isWin: true })]);
    await repo.insertBadReplays([
      { name: "Bad.slp", path: "C:/Slippi/Bad.slp" },
    ]);

    await repo.deleteAllReplays();

    expect(await repo.selectReplayCount()).toBe(0);
    expect(await repo.selectBadReplayCount()).toBe(0);
    expect(await repo.selectAllReplayNames()).toEqual([]);
  });

  // Settings live in their own store; the connect code and the chosen
  // directory have to survive a library being thrown away.
  it("leaves settings alone", async () => {
    const { repo, settings } = setup({ username: USER });

    await repo.deleteAllReplays();

    expect(await settings.selectSetting("username")).toBe(USER);
  });
});

describe("getUserCandidates", () => {
  it("ranks connect codes by how often they appear", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.getUserCandidates(5)).toEqual([
      { connectCode: USER, appearances: 3 },
      { connectCode: THIRD_PLAYER, appearances: 2 },
      { connectCode: OPPONENT, appearances: 1 },
    ]);
  });

  it("returns at most the number asked for", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.getUserCandidates(1)).toEqual([
      { connectCode: USER, appearances: 2 },
    ]);
  });

  it("returns nothing for an empty library", async () => {
    const { repo } = setup();

    expect(await repo.getUserCandidates(5)).toEqual([]);
  });
});

describe("identifyUserFromLiveGame", () => {
  it("is confident about the configured user", async () => {
    const { repo } = setup({ username: "user#001" });

    expect(await repo.identifyUserFromLiveGame([USER, OPPONENT])).toEqual({
      connectCode: USER,
      isConfident: true,
    });
  });

  it("is confident when one player appears in more stored replays", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.identifyUserFromLiveGame([OPPONENT, USER])).toEqual({
      connectCode: USER,
      isConfident: true,
    });
  });

  // Both players appear equally often, so getMostCommonUser falls through to
  // the first candidate — and candidates arrive in the live game's port order.
  // The answer is a coin flip and must not be stored as though it were not.
  it("is not confident when the two players are indistinguishable", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({
        players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")],
      }),
    ]);

    expect(await repo.identifyUserFromLiveGame([USER, OPPONENT])).toMatchObject(
      {
        isConfident: false,
      },
    );
  });

  it("is not confident when the library is empty", async () => {
    const { repo } = setup();

    expect(await repo.identifyUserFromLiveGame([USER, OPPONENT])).toMatchObject(
      {
        isConfident: false,
      },
    );
  });
});

describe("selectRecentReplaysAgainst", () => {
  const history = [
    makeMatch({ opponent: OPPONENT, date: "2025-01-01T00:00:00Z" }),
    makeMatch({ opponent: OPPONENT, date: "2025-03-01T00:00:00Z" }),
    makeMatch({ opponent: OPPONENT, date: "2025-02-01T00:00:00Z" }),
    makeMatch({ opponent: THIRD_PLAYER, date: "2025-04-01T00:00:00Z" }),
  ];

  it("returns games against that opponent only, newest first", async () => {
    const { repo } = setup();
    await seedReplays(repo, history);

    const recent = await repo.selectRecentReplaysAgainst(OPPONENT, 5);

    expect(recent.map((replay) => replay.date)).toEqual([
      "2025-03-01T00:00:00Z",
      "2025-02-01T00:00:00Z",
      "2025-01-01T00:00:00Z",
    ]);
  });

  it("returns no more than the limit", async () => {
    const { repo } = setup();
    await seedReplays(repo, history);

    const recent = await repo.selectRecentReplaysAgainst(OPPONENT, 2);

    expect(recent.map((replay) => replay.date)).toEqual([
      "2025-03-01T00:00:00Z",
      "2025-02-01T00:00:00Z",
    ]);
  });

  // The trim runs mid-scan once enough rows have piled up, so a history longer
  // than the trim threshold has to come back in the same order as a short one.
  it("keeps the newest games across a history long enough to be trimmed", async () => {
    const { repo } = setup();
    await seedReplays(
      repo,
      Array.from({ length: 60 }, (_unused, index) =>
        makeMatch({
          opponent: OPPONENT,
          date: new Date(Date.UTC(2025, 0, index + 1)).toISOString(),
        }),
      ),
    );

    const recent = await repo.selectRecentReplaysAgainst(OPPONENT, 3);

    expect(recent.map((replay) => replay.date)).toEqual([
      new Date(Date.UTC(2025, 0, 60)).toISOString(),
      new Date(Date.UTC(2025, 0, 59)).toISOString(),
      new Date(Date.UTC(2025, 0, 58)).toISOString(),
    ]);
  });

  it("returns nothing for an opponent never played", async () => {
    const { repo } = setup();
    await seedReplays(repo, history);

    expect(await repo.selectRecentReplaysAgainst("NONE#000", 5)).toEqual([]);
  });

  it("returns nothing when asked for no opponent or no games", async () => {
    const { repo } = setup();
    await seedReplays(repo, history);

    expect(await repo.selectRecentReplaysAgainst("", 5)).toEqual([]);
    expect(await repo.selectRecentReplaysAgainst(OPPONENT, 0)).toEqual([]);
  });
});

describe("the legacy latest-replay pointer", () => {
  it("is no longer written when replays are stored", async () => {
    const { repo, replaysStore } = setup();

    await repo.insertReplays([makeReplay({ name: "Game_A.slp" })]);

    expect(await replaysStore.getItem(LATEST_REPLAY_KEY)).toBeNull();
  });

  it("is cleared out of a store that still has one", async () => {
    const { repo, replaysStore } = setup();
    await replaysStore.setItem(LATEST_REPLAY_KEY, "Game_A.slp");

    await repo.deleteLegacyLatestReplayPointer();

    expect(await replaysStore.getItem(LATEST_REPLAY_KEY)).toBeNull();
    expect(await repo.selectReplayCount()).toBe(0);
  });
});
