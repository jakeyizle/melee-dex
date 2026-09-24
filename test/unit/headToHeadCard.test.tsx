// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderComponent } from "../helpers/renderComponent";
import { makeMatch, makeReplay, makePlayer, USER, OPPONENT } from "../helpers/makeReplay";
import { useReplayStore } from "@/replayStore";
import { buildStats, getCurrentHeadToHeadStats } from "@/utils/statUtils";
import { HeadToHeadCard } from "@/components/DashboardPage/LiveMatchDisplay/NewHeadToHeadCard";
import { RecentGamesList } from "@/components/DashboardPage/LiveMatchDisplay/NewHeadToHeadCard/RecentGamesList";
import { CurrentReplayInfo, RankProfile } from "@/types";
import { Replay } from "@/db/replays";

/** Fox vs Marth on Battlefield, which is what `makeMatch` defaults produce. */
const liveGame = (overrides: Partial<CurrentReplayInfo> = {}) => ({
  stageId: "31",
  players: [
    { connectCode: USER, name: "jakeyizle", characterId: "2" },
    { connectCode: OPPONENT, name: "hyruler", characterId: "9" },
  ],
  ...overrides,
});

/**
 * Puts the store in the state the live view sees: a game in progress, and the
 * head-to-head narrowed out of whatever history is given.
 */
const startGame = (
  history: Replay[],
  currentReplayInfo: CurrentReplayInfo = liveGame(),
  recentReplays: Replay[] = [],
) => {
  const newStatInfo = buildStats(history, USER);
  useReplayStore.setState({
    userConnectCode: USER,
    currentReplayInfo,
    newStatInfo,
    headToHeadStats: getCurrentHeadToHeadStats(
      newStatInfo,
      currentReplayInfo,
      USER,
    ),
    recentReplays,
  });
};

const valueFor = (title: string) =>
  screen.getByText(title).nextElementSibling?.textContent;

beforeEach(() => {
  useReplayStore.setState({
    userConnectCode: "",
    currentReplayInfo: null,
    newStatInfo: null,
    headToHeadStats: null,
    recentReplays: [],
    liveRanks: {},
  });
});

afterEach(cleanup);

describe("HeadToHeadCard — when it renders at all", () => {
  it("renders nothing when no game is in progress", () => {
    const { container } = renderComponent(<HeadToHeadCard />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when the user is not one of the two players", () => {
    startGame([], liveGame(), []);
    useReplayStore.setState({ userConnectCode: "SOMEONE#999" });

    const { container } = renderComponent(<HeadToHeadCard />);

    expect(container.innerHTML).toBe("");
  });
});

describe("HeadToHeadCard — Tier 1, an opponent with no history", () => {
  // The whole point of the tier split. This used to render nothing: the card
  // required `headToHeadStats`, and `getCurrentHeadToHeadStats` returns null
  // for an opponent it has never seen — so the most useful answer the app has
  // produced a blank screen.
  it("says so instead of rendering nothing", () => {
    startGame([]);

    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText("Head to Head")).toBeDefined();
    expect(
      screen.getByText(`First time against hyruler (${OPPONENT}).`),
    ).toBeDefined();
  });

  it("falls back to the connect code when the opponent has no display name", () => {
    startGame([], {
      stageId: "31",
      players: [
        { connectCode: USER, name: "jakeyizle", characterId: "2" },
        { connectCode: OPPONENT, name: "", characterId: "9" },
      ],
    });

    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText(`First time against ${OPPONENT}.`)).toBeDefined();
  });

  it("shows a 0 - 0 score rather than omitting it", () => {
    startGame([]);

    renderComponent(<HeadToHeadCard />);

    // Both halves of the score, each its own coloured span.
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("leaves out the Tier 2 context there is no history for", () => {
    startGame([]);

    renderComponent(<HeadToHeadCard />);

    expect(screen.queryByText("Win Rate")).toBeNull();
    expect(screen.queryByText("Ranked")).toBeNull();
    expect(screen.queryByText("Recent Games")).toBeNull();
  });
});

describe("HeadToHeadCard — Tier 1, an opponent already played", () => {
  const history = [
    makeMatch({ isWin: true, userCharacterId: "2", opponentCharacterId: "9" }),
    makeMatch({ isWin: true, userCharacterId: "2", opponentCharacterId: "9" }),
    makeMatch({ isWin: false, userCharacterId: "2", opponentCharacterId: "9" }),
  ];

  it("reports the record against them", () => {
    startGame(history);

    renderComponent(<HeadToHeadCard />);

    expect(screen.queryByText(/First time against/)).toBeNull();
    expect(valueFor("Games Played")).toBe("3 (2 - 1)");
    expect(valueFor("Win Rate")).toBe("66.7%");
  });

  it("splits that record into ranked and unranked", () => {
    startGame([
      makeMatch({ isWin: true }),
      makeReplay({
        mode: "ranked",
        players: [makePlayer(USER, "2"), makePlayer(OPPONENT, "9")],
        winnerConnectCode: OPPONENT,
      }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(valueFor("Unranked")).toBe("1 - 0");
    expect(valueFor("Ranked")).toBe("0 - 1");
  });

  // Connect codes are the identity, but a name is what you remember someone by.
  it("surfaces names they have played under before", () => {
    startGame([
      makeReplay({
        players: [makePlayer(USER, "2"), { ...makePlayer(OPPONENT, "9"), name: "oldtag" }],
        winnerConnectCode: USER,
      }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText("Also played as oldtag.")).toBeDefined();
  });

  it("says nothing about names when the current one is all it has seen", () => {
    startGame([
      makeReplay({
        players: [makePlayer(USER, "2"), { ...makePlayer(OPPONENT, "9"), name: "hyruler" }],
        winnerConnectCode: USER,
      }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(screen.queryByText(/Also played as/)).toBeNull();
  });
});

describe("HeadToHeadCard — Tier 2, this game's context", () => {
  it("reports the record in this matchup and on this stage", () => {
    startGame([
      makeMatch({ isWin: true, userCharacterId: "2", opponentCharacterId: "9", stageId: "31" }),
      makeMatch({ isWin: false, userCharacterId: "2", opponentCharacterId: "9", stageId: "31" }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(valueFor("Fox vs Marth")).toBe("1 - 1 (50%)");
    expect(valueFor("On Battlefield")).toBe("1 - 1 (50%)");
  });

  // A known opponent can still be a new matchup or a new stage, and the row has
  // to say which rather than showing a misleading zero.
  it("calls out a matchup and a stage played for the first time", () => {
    startGame([
      makeMatch({ isWin: true, userCharacterId: "20", opponentCharacterId: "9", stageId: "2" }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(valueFor("Fox vs Marth")).toBe("First time in this matchup");
    expect(valueFor("On Battlefield")).toBe("First time on this stage");
  });

  it("shows the recent games section once there are games to put in it", () => {
    startGame([makeMatch({ isWin: true })], liveGame(), [
      makeMatch({ isWin: true, date: "2025-03-01T00:00:00Z" }),
    ]);

    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText("Recent Games")).toBeDefined();
  });

  it("leaves the recent games section out until the query returns", () => {
    startGame([makeMatch({ isWin: true })], liveGame(), []);

    renderComponent(<HeadToHeadCard />);

    expect(screen.queryByText("Recent Games")).toBeNull();
  });
});

describe("RecentGamesList", () => {
  const rendered = (replays: Replay[]) =>
    renderComponent(
      <RecentGamesList
        replays={replays}
        userConnectCode={USER}
        winColor="orange"
        lossColor="lightblue"
      />,
    );

  it("renders a row per game, marked won or lost from the user's side", () => {
    rendered([
      makeMatch({
        isWin: true,
        userCharacterId: "2",
        opponentCharacterId: "9",
        stageId: "31",
      }),
      makeMatch({
        isWin: false,
        userCharacterId: "20",
        opponentCharacterId: "9",
        stageId: "2",
      }),
    ]);

    expect(screen.getByText("Fox vs Marth")).toBeDefined();
    expect(screen.getByText("Battlefield")).toBeDefined();
    expect(screen.getByText("Falco vs Marth")).toBeDefined();
    expect(screen.getByText("Fountain of Dreams")).toBeDefined();
    expect(screen.getAllByText("W")).toHaveLength(1);
    expect(screen.getAllByText("L")).toHaveLength(1);
  });

  // The list is handed replays, which name both players — it has to read the
  // matchup from the user's side, not from port order.
  it("reads the matchup from the user's side whichever port they were in", () => {
    rendered([
      makeReplay({
        players: [makePlayer(OPPONENT, "9"), makePlayer(USER, "2")],
        winnerConnectCode: USER,
        stageId: "31",
      }),
    ]);

    expect(screen.getByText("Fox vs Marth")).toBeDefined();
  });

  it("renders nothing at all when there are no games", () => {
    const { container } = rendered([]);

    expect(container.innerHTML).toBe("");
  });
});

describe("HeadToHeadCard rank badges", () => {
  const profile = (overrides: Partial<RankProfile> = {}): RankProfile => ({
    connectCode: OPPONENT,
    ratingOrdinal: 1474.65,
    ratingUpdateCount: 8,
    wins: 6,
    losses: 2,
    dailyGlobalPlacement: null,
    tier: "Gold 1",
    ...overrides,
  });

  it("shows each player's tier and rating once the lookup lands", () => {
    startGame([]);
    useReplayStore.setState({
      liveRanks: {
        [USER]: profile({ connectCode: USER, tier: "Diamond 2" }),
        [OPPONENT]: profile(),
      },
    });
    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText("Diamond 2 · 1475")).toBeDefined();
    expect(screen.getByText("Gold 1 · 1475")).toBeDefined();
  });

  // Rank is the one thing on this card that comes from the network, so it is
  // the one thing allowed to be missing. The card must still render.
  it("renders the card without badges when the lookup has not landed", () => {
    startGame([]);
    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText(USER)).toBeDefined();
    expect(screen.getByText(OPPONENT)).toBeDefined();
    expect(screen.queryByText(/Gold|Diamond|Pending/)).toBeNull();
  });

  it("renders no badge for a player whose lookup failed", () => {
    startGame([]);
    useReplayStore.setState({
      liveRanks: { [USER]: profile({ connectCode: USER }), [OPPONENT]: null },
    });
    renderComponent(<HeadToHeadCard />);

    expect(screen.getAllByText(/Gold 1/)).toHaveLength(1);
  });

  // An unplaced profile reports the season's starting rating, which is not a
  // number the player earned.
  it("shows a pending profile without a rating", () => {
    startGame([]);
    useReplayStore.setState({
      liveRanks: {
        [OPPONENT]: profile({
          tier: "Pending",
          ratingOrdinal: 1100,
          ratingUpdateCount: 0,
        }),
      },
    });
    renderComponent(<HeadToHeadCard />);

    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.queryByText(/1100/)).toBeNull();
  });
});
