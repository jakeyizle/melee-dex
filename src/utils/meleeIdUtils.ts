// The character and stage name tables used to live here as hand-maintained
// arrays. They are slippi-js's own data, so they come from slippi-js now —
// the browser entry, because this module is renderer-only and the node entry
// would drag Node built-ins into the bundle. Both util modules import nothing
// but their own JSON, so only a few KB of it survives tree-shaking; the 700KB
// `framedata.json` next door is reached by no path from here.
import { characters, stages } from "@slippi/slippi-js";

/**
 * Ids are strings everywhere in this codebase (see the root CLAUDE.md), so both
 * of these take one and parse it.
 *
 * An id slippi-js does not know does not throw — it hands back an Unknown
 * sentinel, the one entry with `id: -1`. That is what is checked here, so the
 * UI keeps showing the plain "Unknown" it always has rather than the library's
 * "Unknown Character" / "Unknown Stage". `parseInt("")` is NaN, which matches
 * no table and lands in the same place.
 */
const UNKNOWN_ID = -1;

/**
 * `getAllCharacters()` defaults to the playable roster — the same 26 this file
 * used to list by hand. The wider table slippi-js carries goes on into Master
 * Hand, Giga Bowser and the wireframes, and naming one of those would be a
 * worse answer than "Unknown": nothing that reaches this app is a game with
 * them in it, so an id up there means the replay is not what it claims.
 */
const PLAYABLE_CHARACTER_IDS = new Set(
  characters.getAllCharacters().map(({ id }) => id),
);

export const getCharacterNameFromId = (id: string) => {
  const idNumber = parseInt(id);
  if (!PLAYABLE_CHARACTER_IDS.has(idNumber)) return "Unknown";
  return characters.getCharacterName(idNumber);
};

export const getStageNameFromId = (id: string) => {
  const idNumber = parseInt(id);
  if (stages.getStageInfo(idNumber).id === UNKNOWN_ID) return "Unknown";
  return stages.getStageName(idNumber);
};

// legal stages are: Fountain of Dreams, Pokémon Stadium, Dreamland, Battlefield, Final Destination, Yoshi's Story
//
// Deliberately still hand-written: this is a tournament ruleset, not Melee
// data. `stages.getStages("vs")` returns all 29 VS-mode stages, which is a
// different question from which six are legal.
export const LEGAL_STAGE_IDS = [2, 3, 8, 28, 31, 32];
