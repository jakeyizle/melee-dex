// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderComponent } from "../helpers/renderComponent";
import { makeMatch, USER, OPPONENT } from "../helpers/makeReplay";
import { useReplayStore } from "@/replayStore";
import { buildStats, createEmptyFullStats } from "@/utils/statUtils";
import { OverallStatsCard } from "@/components/OverallStatsCard";

const THIRD_PLAYER = "THRD#003";

/** The text of the PaperDisplay whose title is `title`. */
const valueFor = (title: string) =>
  screen.getByText(title).nextElementSibling?.textContent;

beforeEach(() => {
  useReplayStore.setState({ newStatInfo: null });
});

afterEach(cleanup);

describe("OverallStatsCard", () => {
  it("renders nothing before any stats have been built", () => {
    const { container } = renderComponent(<OverallStatsCard />);

    expect(container.innerHTML).toBe("");
  });

  // The release-blocking crash: an identity that matches no stored replay
  // produces a FullStats that is present but empty, and every "best opponent" /
  // "best matchup" row used to index [0] into an empty array and throw, taking
  // the whole renderer down with it.
  it("renders an empty library without crashing", () => {
    useReplayStore.setState({ newStatInfo: createEmptyFullStats() });

    renderComponent(<OverallStatsCard />);

    expect(screen.getByText("Overall Stats")).toBeDefined();
    expect(valueFor("Total Games Played")).toBe("0 (0 - 0)");
    expect(valueFor("Number of Opponents Seen")).toBe("0");
    expect(valueFor("Most Played Opponent")).toBe("-");
    expect(valueFor("Best Record (W/L)")).toBe("-");
    expect(valueFor("Worst Record (W/L)")).toBe("-");
    expect(valueFor("Most Common Matchup")).toBe("-");
    expect(valueFor("Best Matchup")).toBe("-");
  });

  it("reports the record and opponent count for a real library", () => {
    useReplayStore.setState({
      newStatInfo: buildStats(
        [
          makeMatch({ isWin: true, opponent: OPPONENT }),
          makeMatch({ isWin: true, opponent: OPPONENT }),
          makeMatch({ isWin: false, opponent: THIRD_PLAYER }),
        ],
        USER,
      ),
    });

    renderComponent(<OverallStatsCard />);

    expect(valueFor("Total Games Played")).toBe("3 (2 - 1)");
    expect(valueFor("Win Rate")).toBe("66.7%");
    expect(valueFor("Number of Opponents Seen")).toBe("2");
    expect(valueFor("Most Played Opponent")).toBe(OPPONENT);
  });

  it("names the opponent with the best and worst record against", () => {
    useReplayStore.setState({
      newStatInfo: buildStats(
        [
          makeMatch({ isWin: true, opponent: OPPONENT }),
          makeMatch({ isWin: true, opponent: OPPONENT }),
          makeMatch({ isWin: false, opponent: THIRD_PLAYER }),
          makeMatch({ isWin: false, opponent: THIRD_PLAYER }),
        ],
        USER,
      ),
    });

    renderComponent(<OverallStatsCard />);

    expect(valueFor("Best Record (W/L)")).toBe(`${OPPONENT} (2 - 0)`);
    expect(valueFor("Worst Record (W/L)")).toBe(`${THIRD_PLAYER} (0 - 2)`);
  });

  it("describes matchups by character name and record", () => {
    useReplayStore.setState({
      newStatInfo: buildStats(
        [
          // Fox (2) vs Marth (9), played twice and won both.
          makeMatch({
            isWin: true,
            userCharacterId: "2",
            opponentCharacterId: "9",
          }),
          makeMatch({
            isWin: true,
            userCharacterId: "2",
            opponentCharacterId: "9",
          }),
          // Falco (20) vs Marth, played once and lost.
          makeMatch({
            isWin: false,
            userCharacterId: "20",
            opponentCharacterId: "9",
          }),
        ],
        USER,
      ),
    });

    renderComponent(<OverallStatsCard />);

    expect(valueFor("Most Common Matchup")).toBe("Fox vs Marth (2 - 0)");
    expect(valueFor("Least Common Matchup")).toBe("Falco vs Marth (0 - 1)");
    expect(valueFor("Best Matchup")).toBe("Fox vs Marth (2 - 0)");
    expect(valueFor("Worst Matchup")).toBe("Falco vs Marth (0 - 1)");
  });

  // The card reads six "best of" rows out of arrays that live inside the
  // FullStats the store holds. Sorting them in place to do it reordered store
  // state from inside a render — which React is entitled to run twice.
  it("does not reorder the stats it reads", () => {
    const stats = buildStats(
      [
        makeMatch({ isWin: false, opponent: OPPONENT }),
        makeMatch({ isWin: true, opponent: THIRD_PLAYER }),
        makeMatch({ isWin: true, opponent: THIRD_PLAYER }),
      ],
      USER,
    );
    useReplayStore.setState({ newStatInfo: stats });
    const opponentOrder = stats.opponentSpecificStats.map(
      (opponent) => opponent.opponentConnectCode,
    );
    const matchupOrder = stats.stats.matchupStats.map(
      (matchup) => matchup.userCharacterId,
    );

    renderComponent(<OverallStatsCard />);

    expect(
      stats.opponentSpecificStats.map((o) => o.opponentConnectCode),
    ).toEqual(opponentOrder);
    expect(stats.stats.matchupStats.map((m) => m.userCharacterId)).toEqual(
      matchupOrder,
    );
  });
});
