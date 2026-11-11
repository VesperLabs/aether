import type { mapList } from "./map-list";

/** Every map's name, as rooms and doors refer to it. */
export type MapName = (typeof mapList)[number]["name"];

/** Maps that were renamed, old name → new, so characters saved in an old room still load. */
const RENAMED_MAPS: Readonly<Record<string, MapName>> = {
  grassland: "meadow",
  "grassland-2": "town-road",
  "grassland-3": "wildwood",
  "grassland-peaks": "foothills",
  "grassland-peaks-2": "peak-camp",
  "grassland-peaks-3": "summit",
  "grassland-graveyard": "graveyard",
  townInside: "town-houses",
  "townInside-tents": "tents",
  "dungeon-aqueducts": "aqueducts",
};

/** A saved room name as it is called now. */
export const currentMapName = (name: string) => RENAMED_MAPS[name] ?? name;
