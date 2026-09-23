import { describe, it, expect } from "vitest";
import {
  getCharacterNameFromId,
  getStageNameFromId,
  LEGAL_STAGE_IDS,
} from "@/utils/meleeIdUtils";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";

/** The 26 playable characters, which is the whole roster Melee has. */
const CHARACTER_IDS = Array.from({ length: 26 }, (_unused, id) => String(id));

describe("getCharacterNameFromId", () => {
  it("names every character in the roster", () => {
    for (const id of CHARACTER_IDS) {
      expect(getCharacterNameFromId(id), `character ${id}`).not.toBe("Unknown");
      expect(getCharacterNameFromId(id), `character ${id}`).not.toBe("");
    }
  });

  it("gives every character a distinct name", () => {
    const names = CHARACTER_IDS.map(getCharacterNameFromId);

    expect(new Set(names).size).toBe(CHARACTER_IDS.length);
  });

  it("names the ones the rest of the suite relies on", () => {
    expect(getCharacterNameFromId("0")).toBe("Captain Falcon");
    expect(getCharacterNameFromId("2")).toBe("Fox");
    expect(getCharacterNameFromId("9")).toBe("Marth");
    expect(getCharacterNameFromId("20")).toBe("Falco");
  });

  // Ids arrive as strings from the parser, but a replay can still carry
  // something off the end of the roster.
  it("says so rather than guessing for an id it does not know", () => {
    expect(getCharacterNameFromId("26")).toBe("Unknown");
    expect(getCharacterNameFromId("-1")).toBe("Unknown");
    expect(getCharacterNameFromId("")).toBe("Unknown");
    expect(getCharacterNameFromId("not-a-number")).toBe("Unknown");
  });
});

describe("getCharacterIcon", () => {
  it("has an icon for every character in the roster", () => {
    for (const id of CHARACTER_IDS) {
      expect(getCharacterIcon(id), `character ${id}`).toBeTruthy();
    }
  });

  // The silent trap: the switch falls back to Captain Falcon, so a character
  // whose icon import was missed renders as Falcon rather than failing. The
  // only way to see it is to check that no other id shares his icon.
  it("gives every character their own icon, not the Falcon fallback", () => {
    const falcon = getCharacterIcon("0");
    const shareFalconsIcon = CHARACTER_IDS.filter(
      (id) => getCharacterIcon(id) === falcon,
    );

    expect(shareFalconsIcon).toEqual(["0"]);
    expect(new Set(CHARACTER_IDS.map(getCharacterIcon)).size).toBe(
      CHARACTER_IDS.length,
    );
  });

  it("falls back to Captain Falcon for an id off the roster", () => {
    expect(getCharacterIcon("26")).toBe(getCharacterIcon("0"));
    expect(getCharacterIcon("")).toBe(getCharacterIcon("0"));
  });
});

describe("getStageNameFromId", () => {
  // These six are the only stages the library's stage table ever shows, so a
  // gap here is a blank row rather than a wrong one.
  it("names every tournament-legal stage", () => {
    for (const id of LEGAL_STAGE_IDS) {
      const name = getStageNameFromId(id.toString());
      expect(name, `stage ${id}`).not.toBe("Unknown");
      expect(name, `stage ${id}`).not.toBe("");
    }
  });

  it("names the legal stages correctly", () => {
    expect(LEGAL_STAGE_IDS.map((id) => getStageNameFromId(id.toString()))).toEqual([
      "Fountain of Dreams",
      "Pokémon Stadium",
      "Yoshi's Story",
      "Dream Land N64",
      "Battlefield",
      "Final Destination",
    ]);
  });

  it("says so rather than guessing for an id off the table", () => {
    expect(getStageNameFromId("999")).toBe("Unknown");
    expect(getStageNameFromId("-1")).toBe("Unknown");
  });

  // Ids are strings everywhere in the app; LEGAL_STAGE_IDS is the one place
  // they are numbers, which is exactly where the two conventions can drift.
  it("takes the string form of every legal id", () => {
    for (const id of LEGAL_STAGE_IDS) {
      expect(typeof id).toBe("number");
      expect(getStageNameFromId(String(id))).toBe(getStageNameFromId(`${id}`));
    }
  });
});
