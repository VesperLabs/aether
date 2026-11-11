/** The seasons in the order the year runs through them. Summer is each tileset's base art. */
export const SEASONS = ["spring", "summer", "fall", "winter"] as const;

export type Season = (typeof SEASONS)[number];

/** Which season a map shows: the world's (`cycle`), or always the same one. */
export type MapSeasons = "cycle" | Season;
