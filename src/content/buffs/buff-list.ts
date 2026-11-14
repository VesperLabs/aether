import type { BuffDefinition } from "./buff-types";

/**
 * Every buff and debuff at level 1, and what each level past it adds (`perLevel`). Most grow
 * by their own base each level. Crowd control grows longer instead of stronger, and haste in
 * small steps, so neither hits a stat's cap.
 */
export const buffList = {
  evasion: {
    type: "buff",
    duration: 30000,
    stats: { dodgeChance: 5 },
    perLevel: { stats: { dodgeChance: 5 } },
  },
  /** A halo of dawn light: swings burn with holy damage for a moment. */
  aureole: {
    type: "buff",
    duration: 6000,
    stats: { minHolyDamage: 2, maxHolyDamage: 4 },
    perLevel: { stats: { minHolyDamage: 2, maxHolyDamage: 4 } },
  },
  haste: {
    type: "buff",
    duration: 30000,
    stats: { walkSpeed: 20, attackDelay: -25, castDelay: -100 },
    perLevel: { stats: { walkSpeed: 5, attackDelay: -5, castDelay: -20 } },
  },
  brute: {
    type: "buff",
    duration: 30000,
    stats: { minDamage: 2, maxDamage: 3 },
    perLevel: { stats: { minDamage: 2, maxDamage: 3 } },
  },
  guard: {
    type: "guard",
    duration: 30000,
    stats: { defense: 15 },
    perLevel: { stats: { defense: 15 } },
  },
  adrenaline: {
    type: "buff",
    duration: 5000,
    stats: { regenSp: 1 },
    perLevel: { stats: { regenSp: 1 } },
  },
  siphon: {
    type: "buff",
    duration: 5000,
    stats: { mpSteal: 5 },
    perLevel: { stats: { mpSteal: 5 } },
  },
  vampire: {
    type: "buff",
    duration: 5000,
    stats: { hpSteal: 5 },
    perLevel: { stats: { hpSteal: 5 } },
  },
  endurance: {
    type: "buff",
    duration: 30000,
    stats: { maxHp: 15 },
    perLevel: { stats: { maxHp: 15 } },
  },
  genius: {
    type: "buff",
    duration: 30000,
    stats: { maxMp: 15 },
    perLevel: { stats: { maxMp: 15 } },
  },
  protein: {
    type: "buff",
    duration: 30000,
    dispelInCombat: true,
    stats: { regenHp: 3 },
    perLevel: { stats: { regenHp: 3 } },
  },
  /** A clear head: mana flows back faster, even mid-fight. */
  clarity: {
    type: "buff",
    duration: 30000,
    stats: { regenMp: 4 },
    perLevel: { stats: { regenMp: 4 } },
  },
  vitamins: {
    type: "buff",
    duration: 30000,
    dispelInCombat: true,
    stats: { regenMp: 1 },
    perLevel: { stats: { regenMp: 1 } },
  },
  stimulant: {
    type: "buff",
    duration: 15000,
    dispelInCombat: true,
    stats: { regenSp: 1 },
    perLevel: { stats: { regenSp: 1 } },
  },
  regeneration: {
    type: "buff",
    duration: 30000,
    stats: { regenHp: 3 },
    perLevel: { stats: { regenHp: 3 } },
  },
  rest: {
    type: "buff",
    duration: -1,
    dispelInCombat: true,
    description: "Regenerating HP while you are out of combat.",
  },
  stun: { type: "debuff", duration: 500, knockback: true, perLevel: { duration: 100 } },
  slow: {
    type: "debuff",
    duration: 3000,
    stats: { walkSpeed: -25, attackDelay: 50, castDelay: 100 },
    perLevel: { duration: 500 },
  },
  poison: {
    type: "debuff",
    duration: 6000,
    stats: { poisonDamage: 1 },
    perLevel: { stats: { poisonDamage: 1 } },
  },
  /** Open wounds: hp drips away, a little faster and shorter than poison. */
  bleed: {
    type: "debuff",
    duration: 4000,
    stats: { bleedDamage: 1 },
    perLevel: { stats: { bleedDamage: 1 } },
    description: "Losing HP from open wounds.",
  },
  fortune: {
    type: "buff",
    duration: 10000,
    stats: { magicFind: 25 },
    perLevel: { stats: { magicFind: 10 } },
    description: "Increased chance to find loot from slain enemies.",
  },
  stealth: {
    type: "buff",
    duration: -1,
    dispelAfterAttack: true,
    dispelInCombat: true,
    dispelOnHit: true,
    stats: { critChance: 100 },
    percentStats: { walkSpeed: -50 },
    description: "Hidden from sight while you are out of combat.",
  },
} as const satisfies Readonly<Record<string, BuffDefinition>>;

export type BuffName = keyof typeof buffList;
