import type { MapSeasons } from "./seasons";

export interface MapDefinition {
  readonly name: string;
  readonly music?: string;
  readonly json: string;
  /** Which season its tilesets show. Without one, the map always shows its base (summer) art. */
  readonly seasons?: MapSeasons;
  /** Under the open sky, so it darkens at night. */
  readonly isOutdoors?: boolean;
}

export interface MapImageDefinition {
  readonly name: string;
  readonly image: string;
}
