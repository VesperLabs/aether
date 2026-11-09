/**
 * Colours of the debug view (`DEBUG=true`), in one place so its layers read as one picture: bodies
 * stay quiet, attacks stand out, and what got hit is the loudest.
 */
export const DEBUG_COLORS = {
  /** Characters, spells, loot: anything with a physics body. */
  body: 0x7fd6c2,
  /** Walls and other bodies that don't move. */
  staticBody: 0x5a6a7a,
  /** Where an attack can hit (a swing's wedge, a spell's area). */
  attack: 0xffc23d,
  /** A hit the server confirmed: the victim's hit box. */
  hit: 0xff4d5e,
} as const;

/** How opaque a debug area's fill is; its outline is solid. */
export const DEBUG_FILL_ALPHA = 0.12;
