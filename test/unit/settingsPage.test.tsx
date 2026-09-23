// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderComponent } from "../helpers/renderComponent";
import { USER } from "../helpers/makeReplay";

const { selectAllSettings, upsertSettings, dropDB } = vi.hoisted(() => ({
  selectAllSettings: vi.fn(async () => ({
    replayDirectory: "C:/Slippi",
    username: "",
  })),
  upsertSettings: vi.fn(async () => {}),
  dropDB: vi.fn(async () => {}),
}));

vi.mock("@/db/settings", () => ({
  selectAllSettings,
  upsertSettings,
  selectSetting: vi.fn(async () => ""),
  upsertSetting: vi.fn(async () => {}),
  needsReplayBackfill: vi.fn(async () => false),
  markReplayBackfillDone: vi.fn(async () => {}),
  settingsRepository: {
    selectSetting: vi.fn(async () => ""),
    selectAllSettings,
    upsertSetting: vi.fn(async () => {}),
    upsertSettings,
  },
}));

vi.mock("@/db/stores", () => ({
  dropDB,
  settingsStore: {},
  replaysStore: {},
  badReplaysStore: {},
}));

const { useReplayStore } = await import("@/replayStore");
const { SettingsPage } = await import("@/components/SettingsPage");

const confirmUserConnectCode = vi.fn(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  selectAllSettings.mockResolvedValue({
    replayDirectory: "C:/Slippi",
    username: "",
  });
  useReplayStore.setState({ confirmUserConnectCode });
});

afterEach(cleanup);

const connectCodeField = () =>
  screen.getByPlaceholderText("Enter your Slippi connect code...");

describe("SettingsPage — the connect code", () => {
  // The release-blocking bug this replaced: every keystroke was persisted, so
  // "JAKE#193" stored "J", "JA", "JAK"... and whichever half-typed prefix was
  // last written became the identity — matching no player, and leaving an
  // empty-but-present FullStats behind it.
  it("is not stored while it is being typed", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "JAKE#193");

    expect(confirmUserConnectCode).not.toHaveBeenCalled();
    expect(upsertSettings).not.toHaveBeenCalled();
  });

  it("is stored once the field is left", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "JAKE#193");
    await userEvent.tab();

    expect(confirmUserConnectCode).toHaveBeenCalledOnce();
    expect(confirmUserConnectCode).toHaveBeenCalledWith("JAKE#193");
  });

  it("is stored when the settings are saved", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "JAKE#193");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(confirmUserConnectCode).toHaveBeenCalledWith("JAKE#193");
  });

  // It goes through the store, not straight to settings, so the stats are
  // rebuilt against the new code instead of waiting for the next launch.
  it("is committed through the store so the stats follow it", async () => {
    selectAllSettings.mockResolvedValue({
      replayDirectory: "C:/Slippi",
      username: USER,
    });

    renderComponent(<SettingsPage />);
    await waitFor(() => expect(connectCodeField()).toHaveProperty("value", USER));

    await userEvent.click(connectCodeField());
    await userEvent.tab();

    expect(confirmUserConnectCode).toHaveBeenCalledWith(USER);
  });
});

describe("SettingsPage — the connect code has to look like one", () => {
  // A typo stores a code that matches no player, and the stats come back empty
  // with nothing on screen to explain why.
  it("refuses something that is not a connect code", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "jakeyizle");
    await userEvent.tab();

    expect(
      screen.getByText(/That does not look like a connect code/),
    ).toBeDefined();
    expect(confirmUserConnectCode).not.toHaveBeenCalled();
  });

  it("accepts the shapes a real code takes", async () => {
    for (const code of ["A#1", "JAKE#193", "ab#12345"]) {
      cleanup();
      vi.clearAllMocks();
      renderComponent(<SettingsPage />);
      await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

      await userEvent.clear(connectCodeField());
      await userEvent.type(connectCodeField(), code);
      await userEvent.tab();

      expect(confirmUserConnectCode).toHaveBeenCalledWith(code);
    }
  });

  it("rejects a code with no hash, or too many letters", async () => {
    for (const code of ["JAKE193", "JAKEY#193", "#193", "JAKE#"]) {
      cleanup();
      vi.clearAllMocks();
      renderComponent(<SettingsPage />);
      await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

      await userEvent.type(connectCodeField(), code);
      await userEvent.tab();

      expect(confirmUserConnectCode, code).not.toHaveBeenCalled();
    }
  });

  // Leaving it blank is a real choice: a live game can settle the identity on
  // its own, so an empty field is not an error.
  it("allows the field to be left empty", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.click(connectCodeField());
    await userEvent.tab();

    expect(
      screen.queryByText(/That does not look like a connect code/),
    ).toBeNull();
  });

  it("will not save while the code is malformed", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(
      screen.getByText(/That does not look like a connect code/),
    ).toBeDefined();
  });

  it("clears the complaint once the code is being corrected", async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.type(connectCodeField(), "nope");
    await userEvent.tab();
    await userEvent.type(connectCodeField(), "1");

    expect(
      screen.queryByText(/That does not look like a connect code/),
    ).toBeNull();
  });
});

describe("SettingsPage — the replay directory", () => {
  it("will not save without one", async () => {
    selectAllSettings.mockResolvedValue({ replayDirectory: "", username: "" });

    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(screen.getByText("Please select a replay directory")).toBeDefined();
  });

  it("shows the configured directory", async () => {
    renderComponent(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("C:/Slippi")).toBeDefined(),
    );
  });
});

describe("SettingsPage — deleting the database", () => {
  const openDialog = async () => {
    renderComponent(<SettingsPage />);
    await waitFor(() => expect(selectAllSettings).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  };

  it("asks for confirmation before destroying anything", async () => {
    await openDialog();

    expect(screen.getByText("Confirm Database Deletion")).toBeDefined();
    expect(dropDB).not.toHaveBeenCalled();
  });

  // The whole library, unrecoverable, and the only reset the app offers. The
  // button stays disabled until the word is typed exactly.
  it("keeps the confirm button disabled until 'delete' is typed", async () => {
    await openDialog();

    const confirmButton = screen.getByRole("button", {
      name: "Delete Database",
    });
    expect(confirmButton).toHaveProperty("disabled", true);

    await userEvent.type(
      screen.getByLabelText("Type 'delete' to confirm"),
      "delete",
    );

    expect(confirmButton).toHaveProperty("disabled", false);
  });

  it("does not delete on a near miss", async () => {
    await openDialog();

    await userEvent.type(
      screen.getByLabelText("Type 'delete' to confirm"),
      "delet",
    );

    expect(
      screen.getByRole("button", { name: "Delete Database" }),
    ).toHaveProperty("disabled", true);
    expect(dropDB).not.toHaveBeenCalled();
  });

  it("deletes once confirmed", async () => {
    await openDialog();

    await userEvent.type(
      screen.getByLabelText("Type 'delete' to confirm"),
      "delete",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Database" }),
    );

    expect(dropDB).toHaveBeenCalledOnce();
  });

  it("can be backed out of", async () => {
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByText("Confirm Database Deletion")).toBeNull(),
    );
    expect(dropDB).not.toHaveBeenCalled();
  });
});
