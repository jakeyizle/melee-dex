// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderComponent } from "../helpers/renderComponent";
import { USER, OPPONENT } from "../helpers/makeReplay";
import { useReplayStore } from "@/replayStore";
import { NoIdentityCard } from "@/components/NoIdentityCard";

const confirmUserConnectCode = vi.fn(async () => {});

beforeEach(() => {
  confirmUserConnectCode.mockClear();
  useReplayStore.setState({ userCandidates: [], confirmUserConnectCode });
});

afterEach(cleanup);

describe("NoIdentityCard", () => {
  // Rule C. The app counted every player during the import, so it knows who is
  // likeliest — it offers them rather than storing a guess, because a wrong
  // guess that gets persisted is invisible and never revisited.
  it("offers each candidate with how many games they appear in", () => {
    useReplayStore.setState({
      userCandidates: [
        { connectCode: USER, appearances: 12 },
        { connectCode: OPPONENT, appearances: 4 },
      ],
    });

    renderComponent(<NoIdentityCard />);

    expect(screen.getByText(USER)).toBeDefined();
    expect(screen.getByText("12 games")).toBeDefined();
    expect(screen.getByText(OPPONENT)).toBeDefined();
    expect(screen.getByText("4 games")).toBeDefined();
  });

  it("says 'game', not 'games', for a single appearance", () => {
    useReplayStore.setState({
      userCandidates: [{ connectCode: USER, appearances: 1 }],
    });

    renderComponent(<NoIdentityCard />);

    expect(screen.getByText("1 game")).toBeDefined();
  });

  it("stores the candidate that was clicked", async () => {
    useReplayStore.setState({
      userCandidates: [
        { connectCode: USER, appearances: 12 },
        { connectCode: OPPONENT, appearances: 4 },
      ],
    });

    renderComponent(<NoIdentityCard />);
    await userEvent.click(screen.getByRole("button", { name: /4 games/ }));

    expect(confirmUserConnectCode).toHaveBeenCalledWith(OPPONENT);
    expect(confirmUserConnectCode).toHaveBeenCalledTimes(1);
  });

  // A library with nothing in it, or one where no replay names a player. There
  // is nothing to offer, so the card has to say so rather than render an empty
  // list that looks broken.
  it("explains itself when there is nobody to offer", () => {
    renderComponent(<NoIdentityCard />);

    expect(screen.getByText("Nothing to go on yet")).toBeDefined();
    expect(screen.queryByRole("button", { name: /games/ })).toBeNull();
  });

  it("always offers Settings as a way out", () => {
    renderComponent(<NoIdentityCard />);

    expect(
      screen.getByRole("button", { name: "Enter it in Settings" }),
    ).toBeDefined();
  });
});
