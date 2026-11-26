/**
 * Depths in the world that several files must agree on. Characters, loot and signs sort by `y`
 * from 100 up, under all of these.
 */

/** Marks left on the ground (footprints in snow): over the map's ground layers, under everything standing on them. */
export const GROUND_MARKS_DEPTH = 4;

/** The map's `Above` layer (tree tops, roofs), drawn over characters. */
export const ABOVE_LAYER_DEPTH = 50_000;

/**
 * The night's light map, multiplied over everything below it, tree tops included. Its lights have
 * the tree tops cut out, so a light under the leaves doesn't light them (see `drawLights`).
 */
export const DAYLIGHT_DEPTH = 50_001;

/** Cloud shadows drifting over the map: over tree tops and roofs, under the night's light map. */
export const CLOUD_DEPTH = 50_000.5;

/** Ground mist: over the map's ground layers and marks on them, under everything standing in it. */
export const GROUND_FOG_DEPTH = 5;
