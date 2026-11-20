/*
 * The thrown balls' sprite sheet: one row per ball, each a whole tumble of 20x20 frames that loops:
 * a 15px ball with a 1px outline, centred so neighbouring frames sit 3px apart.
 * A ball's row is its tier less one, which is also the level of `capturing` it puts on.
 */

export const BALL_SHEET = "pokeball-roll";
/** The balls, by row: each one's spell (and item base) is its name, its animation `<name>-roll`. */
export const BALL_ROWS = ["pokeball", "greatball", "ultraball", "masterball"] as const;
export const BALL_FRAMES = 16;

/** The frame of a shut ball, upright, for a `capturing` at `level`. */
export const shutBallFrame = (level = 1) =>
  (Math.min(Math.max(1, Math.floor(level)), BALL_ROWS.length) - 1) * BALL_FRAMES;

/** The shut frame of the ball whose base is `base`, or undefined if it is no ball. */
export function ballFrameOf(base?: string) {
  const row = (BALL_ROWS as readonly (string | undefined)[]).indexOf(base);
  return row < 0 ? undefined : row * BALL_FRAMES;
}

/** Whether a spell is a thrown ball. */
export const isBallSpell = (spellName: string) =>
  (BALL_ROWS as readonly string[]).includes(spellName);

/** Where a flight's animation starts: a thrown ball tumbles from any frame, everything else from 0. */
export const tumbleStart = (spellName: string) =>
  isBallSpell(spellName) ? Math.floor(Math.random() * BALL_FRAMES) : 0;
