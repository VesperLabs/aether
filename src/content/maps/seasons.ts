/** The seasons in the order the year runs through them. Summer is each tileset's base art. */
export const SEASONS = ["spring", "summer", "fall", "winter"] as const;

export type Season = (typeof SEASONS)[number];

/** Which season a map shows: the world's (`cycle`), or always the same one. */
export type MapSeasons = "cycle" | Season;

/** A small picture: an image, and how far to turn its hue (fall reuses summer's leaf, orange). */
export interface SeasonIcon {
  readonly image: string;
  readonly hueRotate?: number;
}

/** The real world's seasons, for `/season real`: a globe. */
export const EARTH_ICON: SeasonIcon = { image: "./assets/icons/sky/earth.png" };

/** Each season's icon, for the HUD and the `/season` suggestions. */
export const SEASON_ICONS: Record<Season, SeasonIcon> = {
  spring: { image: "./assets/icons/sky/spring.png" },
  summer: { image: "./assets/icons/sky/summer.png" },
  fall: { image: "./assets/icons/sky/summer.png", hueRotate: -75 },
  winter: { image: "./assets/icons/sky/winter.png" },
};
