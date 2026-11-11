/**
 * Depths in the world that several files must agree on. Characters, loot and signs sort by `y`
 * from 100 up, under all of these.
 */

/** The map's `Above` layer (tree tops, roofs), drawn over characters. */
export const ABOVE_LAYER_DEPTH = 50_000;

/**
 * The night's light map, multiplied over everything below it, tree tops included. Its lights have
 * the tree tops cut out, so a light under the leaves doesn't light them (see `drawLights`).
 */
export const DAYLIGHT_DEPTH = 50_001;
