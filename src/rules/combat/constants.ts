/** Weapon range multiplier: a weapon's `range` stat times this is its reach in pixels. */
export const RANGE_MULTIPLIER = 28;
/** Cooldown between potions, in ms. Also how far back a fresh character's last attack is set. */
export const POTION_COOLDOWN = 10000;
/** Races that have attack animations. Others just "stand" while attacking. */
export const RACES_WITH_ATTACK_ANIMS = ["crab", "human", "bear", "wolf", "slime"];
/** How long, in ms, without taking or dealing damage before a character counts as out of combat. */
export const OUT_OF_COMBAT_MS = 5000;
/** Stealth never fades a character past this alpha. */
export const MIN_STEALTH_ALPHA = 0.4;
/** Weapon-less characters hit from their body plus this many pixels. */
export const UNARMED_RANGE = 8;
