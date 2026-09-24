// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { renderComponent } from "../helpers/renderComponent";
import { makeMatch, USER, OPPONENT } from "../helpers/makeReplay";
import { buildStats, createEmptyFullStats } from "@/utils/statUtils";

// `useReplayDirectory` reads the configured directory on mount, and the store
// reads settings on several paths. Only the directory matters here.
// Hoisted, because `vi.mock` factories are lifted above ordinary consts.
const { selectAllSettings } = vi.hoisted(() => ({
  selectAllSettings: vi.fn(async () => ({
    replayDirectory: "C:/Slippi",
    username: "JAKE#193",
  })),
}));

vi.mock("@/db/settings", () => ({
  selectAllSettings,
  selectSetting: vi.fn(async () => ""),
  upsertSetting: vi.fn(async () => {}),
  upsertSettings: vi.fn(async () => {}),
  needsReplayBackfill: vi.fn(async () => false),
  markReplayBackfillDone: vi.fn(async () => {}),
  // `db/replays.ts` builds its repository against this at import time.
  settingsRepository: {
    selectSetting: vi.fn(async () => ""),
    selectAllSettings,
    upsertSetting: vi.fn(async () => {}),
    upsertSettings: vi.fn(async () => {}),
  },
}));

const { useReplayStore } = await import("@/replayStore");
const { DashboardPage } = await import("@/components/DashboardPage");
const { LibraryPage } = await import("@/components/LibraryPage");
const { LiveMatchDisplay } =
  await import("@/components/DashboardPage/LiveMatchDisplay");

const liveGame = {
  stageId: "31",
  players: [
    { connectCode: USER, name: "jakeyizle", characterId: "2" },
    { connectCode: OPPONENT, name: "hyruler", characterId: "9" },
  ],
};

beforeEach(() => {
  selectAllSettings.mockResolvedValue({
    replayDirectory: "C:/Slippi",
    username: USER,
  });
  useReplayStore.setState({
    // Importing is the store's job and needs Electron; these tests are about
    // which card the route decides to show.
    loadReplayDirectory: vi.fn(),
    isLoadingReplays: false,
    isBackfilling: false,
    replayDirectoryError: null,
    currentReplayInfo: null,
    newStatInfo: null,
    userConnectCode: USER,
    userCandidates: [],
    headToHeadStats: null,
    recentReplays: [],
  });
});

afterEach(cleanup);

describe("DashboardPage — which card the live route shows", () => {
  it("waits on a spinner until the configured directory is known", () => {
    renderComponent(<DashboardPage />);

    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("asks for a replay directory when none is configured", async () => {
    selectAllSettings.mockResolvedValue({
      replayDirectory: "",
      username: "",
    });

    renderComponent(<DashboardPage />);

    expect(
      await screen.findByText("Set Up Your Replay Directory"),
    ).toBeDefined();
  });

  it("shows import progress while replays are loading", async () => {
    useReplayStore.setState({ isLoadingReplays: true });

    renderComponent(<DashboardPage />);

    expect(await screen.findByText("Loading Replay Files")).toBeDefined();
  });

  it("listens for a game once the import is done", async () => {
    renderComponent(<DashboardPage />);

    expect(await screen.findByText("Listening for Games")).toBeDefined();
  });

  it("shows the live view once a game is in progress", async () => {
    useReplayStore.setState({ currentReplayInfo: liveGame });

    renderComponent(<DashboardPage />);

    expect(await screen.findByText("Head to Head")).toBeDefined();
    expect(screen.queryByText("Listening for Games")).toBeNull();
  });
});

describe("ReplayLoadInProgressCard — telling a backfill apart from an import", () => {
  it("calls an ordinary import what it is", async () => {
    useReplayStore.setState({ isLoadingReplays: true });

    renderComponent(<DashboardPage />);

    expect(await screen.findByText("Loading Replay Files")).toBeDefined();
  });

  // Existing users get a full re-read on first launch of a new schema. Without
  // saying so it looks like the app has forgotten their library.
  it("explains a re-read that the user did not ask for", async () => {
    useReplayStore.setState({ isLoadingReplays: true, isBackfilling: true });

    renderComponent(<DashboardPage />);

    expect(await screen.findByText("Updating Your Replays")).toBeDefined();
    expect(screen.getByText(/It only happens once/)).toBeDefined();
  });
});

describe("LibraryPage — which card the any-time route shows", () => {
  it("asks for a replay directory when none is configured", async () => {
    selectAllSettings.mockResolvedValue({
      replayDirectory: "",
      username: "",
    });

    renderComponent(<LibraryPage />);

    expect(
      await screen.findByText("Set Up Your Replay Directory"),
    ).toBeDefined();
  });

  it("shows import progress while replays are loading", async () => {
    useReplayStore.setState({ isLoadingReplays: true });

    renderComponent(<LibraryPage />);

    expect(await screen.findByText("Loading Replay Files")).toBeDefined();
  });

  // No stats at all means no identity was ever settled, which is a different
  // problem from having stats that happen to be empty.
  it("asks who the user is when no stats were built", async () => {
    useReplayStore.setState({
      newStatInfo: null,
      userCandidates: [{ connectCode: USER, appearances: 12 }],
    });

    renderComponent(<LibraryPage />);

    expect(await screen.findByText("Which of these is you?")).toBeDefined();
  });

  it("says there are no games when the identity matches nothing", async () => {
    useReplayStore.setState({ newStatInfo: createEmptyFullStats() });

    renderComponent(<LibraryPage />);

    expect(await screen.findByText("No games yet")).toBeDefined();
  });

  it("shows the library once there is something in it", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
    });

    renderComponent(<LibraryPage />);

    expect(await screen.findByText("Overall Stats")).toBeDefined();
    expect(screen.getByText("Ranked and Unranked")).toBeDefined();
    expect(screen.getByText("By Stage")).toBeDefined();
  });

  // The library is readable at any time — that separation from the dashboard is
  // the reason it exists as its own route.
  it("does not wait on a game being in progress", async () => {
    useReplayStore.setState({
      currentReplayInfo: null,
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
    });

    renderComponent(<LibraryPage />);

    expect(await screen.findByText("Overall Stats")).toBeDefined();
  });
});

describe("LiveMatchDisplay — a game with nobody identified", () => {
  it("asks who the user is rather than showing a record for nobody", () => {
    useReplayStore.setState({
      userConnectCode: "",
      currentReplayInfo: liveGame,
    });

    renderComponent(<LiveMatchDisplay />);

    expect(screen.getByText("Which of these is you?")).toBeDefined();
    expect(screen.queryByText("Head to Head")).toBeNull();
  });

  it("shows both cards once the user is known", async () => {
    useReplayStore.setState({
      userConnectCode: USER,
      currentReplayInfo: liveGame,
    });

    renderComponent(<LiveMatchDisplay />);

    await waitFor(() => expect(screen.getByText("Head to Head")).toBeDefined());
  });
});

describe("a replay directory that cannot be read", () => {
  it("says so on the dashboard instead of listening for games", async () => {
    useReplayStore.setState({ replayDirectoryError: "D:/Gone" });

    renderComponent(<DashboardPage />);

    expect(
      await screen.findByText("Your Replay Directory Is Missing"),
    ).toBeDefined();
    expect(screen.queryByText("Listening for Games")).toBeNull();
  });

  it("names the folder it could not read", async () => {
    useReplayStore.setState({ replayDirectoryError: "D:/Gone" });

    renderComponent(<DashboardPage />);

    expect(await screen.findByText("D:/Gone")).toBeDefined();
  });

  it("says so on the library too", async () => {
    useReplayStore.setState({
      replayDirectoryError: "D:/Gone",
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
    });

    renderComponent(<LibraryPage />);

    expect(
      await screen.findByText("Your Replay Directory Is Missing"),
    ).toBeDefined();
    expect(screen.queryByText("Overall Stats")).toBeNull();
  });

  // Asking for a directory comes first: there is nothing to fail to read until
  // one has been chosen.
  it("asks for a directory first when none is configured", async () => {
    selectAllSettings.mockResolvedValue({ replayDirectory: "", username: "" });
    useReplayStore.setState({ replayDirectoryError: "" });

    renderComponent(<DashboardPage />);

    expect(
      await screen.findByText("Set Up Your Replay Directory"),
    ).toBeDefined();
  });
});
