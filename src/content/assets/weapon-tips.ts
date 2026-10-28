/**
 * Where each weapon's tip is in its art, in pixels. Weapon art is 100x100 with the handle at the
 * centre (`WEAPON_GRIP`), so the tip gives the way the weapon points and how long it is. Swings
 * use it to turn the weapon with the blade and size the trail to it.
 *
 * Measured from the images (the opaque pixel farthest from the grip); tune by eye if a swing looks
 * off. Weapons not listed point up-left like a short sword.
 */
export const WEAPON_GRIP = { x: 50, y: 50 } as const;

const DEFAULT_TIP = { x: 35, y: 35 } as const;

export const WEAPON_TIPS: Record<string, { x: number; y: number }> = {
  "weapon-axe": { x: 30, y: 36 },
  "weapon-cinquedea": { x: 38, y: 38 },
  "weapon-claw": { x: 36, y: 53 },
  "weapon-claymore-soul": { x: 15, y: 13 },
  "weapon-claymore": { x: 29, y: 29 },
  "weapon-cleaver": { x: 30, y: 36 },
  "weapon-club": { x: 36, y: 34 },
  "weapon-cudgel": { x: 40, y: 36 },
  "weapon-dagger-carnage": { x: 34, y: 35 },
  "weapon-dagger": { x: 39, y: 38 },
  "weapon-dirk": { x: 37, y: 37 },
  "weapon-gladius": { x: 30, y: 30 },
  "weapon-halberd": { x: 10, y: 11 },
  "weapon-hammer": { x: 32, y: 42 },
  "weapon-harvester": { x: 30, y: 34 },
  "weapon-hatchet": { x: 38, y: 36 },
  "weapon-hotdog": { x: 28, y: 25 },
  "weapon-katar": { x: 36, y: 63 },
  "weapon-scimitar-fox": { x: 31, y: 30 },
  "weapon-scimitar": { x: 41, y: 34 },
  "weapon-scythe": { x: 31, y: 35 },
  "weapon-shamshir": { x: 36, y: 28 },
  "weapon-sickle": { x: 30, y: 36 },
  "weapon-spear": { x: 24, y: 0 },
  "weapon-spetum": { x: 9, y: 9 },
  "weapon-spikes": { x: 35, y: 53 },
  "weapon-staff-crystal": { x: 32, y: 31 },
  "weapon-staff-decanter": { x: 34, y: 30 },
  "weapon-staff-metal": { x: 32, y: 30 },
  "weapon-staff-oak": { x: 33, y: 31 },
  "weapon-sword-colada": { x: 31, y: 29 },
  "weapon-sword-short": { x: 35, y: 35 },
  "weapon-sword-tizona": { x: 31, y: 30 },
  "weapon-talwar": { x: 34, y: 30 },
  "weapon-tomahawk": { x: 30, y: 36 },
  "weapon-wand-ball": { x: 39, y: 37 },
  "weapon-wand-clover": { x: 39, y: 35 },
  "weapon-wand-stick": { x: 36, y: 35 },
  "weapon-wyrm-blade": { x: 25, y: 27 },
};

/** The tip of a weapon texture's art, falling back to a short sword's. */
export function getWeaponTip(texture: string | undefined) {
  return (texture && WEAPON_TIPS[texture]) || DEFAULT_TIP;
}
