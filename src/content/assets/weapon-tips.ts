import MEASURED_TIPS from "./weapon-tips.json";

/**
 * Where each weapon's tip is in its art, in pixels. Weapon art is 100x100 with the handle at the
 * centre (`WEAPON_GRIP`), so the tip gives the way the weapon points and how long it is.
 *
 * Generated from the images by `npm run weapon-tips` (the opaque pixel farthest from the grip), and
 * `npm run check` fails if it's stale. This is the only source of a melee weapon's reach: the item
 * builder turns it into the weapon's `range` stat (see `getMeleeRange`), which hits, swing arcs and
 * tooltips all read.
 */
export const WEAPON_GRIP = { x: 50, y: 50 } as const;

/** Where the grip is inside a weapon's preview (its `previewRect` cut out of the art). */
export function getPreviewGrip(previewRect: readonly number[]) {
  return { x: WEAPON_GRIP.x - previewRect[0], y: WEAPON_GRIP.y - previewRect[1] };
}

const DEFAULT_TIP = { x: 35, y: 35 } as const;

export const WEAPON_TIPS: Record<string, { x: number; y: number }> = MEASURED_TIPS;

/** The tip of a weapon texture's art, falling back to a short sword's. */
export function getWeaponTip(texture: string | undefined) {
  return (texture && WEAPON_TIPS[texture]) || DEFAULT_TIP;
}

/** Pixels per point of the `range` stat. */
export const RANGE_MULTIPLIER = 28;

/**
 * How far a swinging hand is from the body centre, in pixels: the median over the human attack
 * frames in `public/assets/atlas/weapon.json`. A swing reaches this plus the blade.
 */
export const HAND_REACH = 13;

/** How long a weapon's art is, grip to tip, in pixels. */
export function getWeaponLength(texture: string | undefined) {
  const tip = getWeaponTip(texture);
  return Math.hypot(tip.x - WEAPON_GRIP.x, tip.y - WEAPON_GRIP.y);
}

/** A melee weapon's `range` stat: its hand plus blade reach, in `RANGE_MULTIPLIER` units. */
export function getMeleeRange(texture: string | undefined) {
  return Math.round(((HAND_REACH + getWeaponLength(texture)) / RANGE_MULTIPLIER) * 100) / 100;
}
