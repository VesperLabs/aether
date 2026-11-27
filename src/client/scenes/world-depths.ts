/**
 * Depths in the world that several files must agree on. Characters, loot and signs sort by `y`
 * from 100 up, under all of these.
 */

/** Marks left on the ground (footprints in snow): over the map's ground layers, under everything standing on them. */
export const GROUND_MARKS_DEPTH = 4;

/** The map's `Above` layer (tree tops, roofs), drawn over characters. */
export const ABOVE_LAYER_DEPTH = 50_000;

/**
 * The old season's tree tops and roofs while they fade out (see `fadeMapChange`): just over the new
 * ones, under fog puffs and cloud shadows, so those never blink behind the old season.
 */
export const ABOVE_LAYER_FADE_DEPTH = ABOVE_LAYER_DEPTH + 0.1;

/**
 * The night's light map, multiplied over everything below it, tree tops included. Its lights have
 * the tree tops cut out, so a light under the leaves doesn't light them (see `drawLights`).
 */
export const DAYLIGHT_DEPTH = 50_001;

/** A storm's lightning: over everything, the night's light map too, so a flash lights the night. */
export const LIGHTNING_DEPTH = 50_001.5;

/** The even grey of showers and storms: just under the falling rain or snow. */
export const OVERCAST_DEPTH = 50_000.6;

/** Cloud shadows drifting over the map: over tree tops and roofs, under the night's light map. */
export const CLOUD_DEPTH = 50_000.5;

/** Falling snow or rain: over tree tops, roofs and cloud shadows, under the night's light map. */
export const PRECIPITATION_DEPTH = 50_000.75;

/** Rain splashing on the ground: over footprints, under ground mist and everything standing. */
export const SPLASH_DEPTH = GROUND_MARKS_DEPTH + 0.5;

/** Ground mist: over the map's ground layers and marks on them, under everything standing in it. */
export const GROUND_FOG_DEPTH = 5;
