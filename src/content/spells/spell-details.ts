import type { SpellDefinition, SpellLook } from "./spell-types";

/** A ball that flies 120px along the aim and grows with rank. */
function ball(name: string, speed: number, look: Partial<SpellLook> = {}) {
  return {
    delivery: { type: "projectile", size: 16, speed, range: 120 },
    scale: { base: 0.25, perRank: 0.1 },
    npcRange: [50, 200],
    look: { visibleMs: 1400, layer: "above", sprite: { animation: `spell-anim-${name}` }, ...look },
  } as const;
}

/** A buff that glows on the caster for a moment, catching any ally it overlaps. */
function aura(tint: string) {
  return {
    delivery: { type: "aura", size: 32, hitMs: 100 },
    targets: ["self", "ally"],
    scale: { base: 0.6 },
    npcRange: [100, 150],
    look: {
      visibleMs: 2200,
      layer: "below",
      sprite: { animation: "spell-anim-chakra" },
      tint,
      fades: true,
      sound: "spell-buff-1",
    },
  } as const;
}

export const spellDetails = {
  "attack-melee": {
    delivery: { type: "swing", size: 16, hitMs: 120 },
    targets: ["enemy"],
    look: { visibleMs: 200, layer: "below", sound: "melee-swing-1" },
  },
  "attack-ranged": {
    delivery: { type: "projectile", size: 4, speed: 350 },
    targets: ["enemy"],
    look: { visibleMs: 2000, layer: "above", sprite: { icon: "arrow" } },
  },
  tackle: {
    delivery: { type: "dash", size: 16, speed: 350, hitMs: 160 },
    targets: ["enemy"],
    cooldown: 2500,
    npcRange: [16, 48],
    look: { visibleMs: 160, layer: "below" },
    description: "Dash forward and tackle whoever you run through with your weapon.",
  },
  "flame-slash": {
    delivery: { type: "swing", size: 16, hitMs: 120 },
    targets: ["enemy"],
    cooldown: 1000,
    look: { visibleMs: 300, layer: "below", tint: "0xFF7A2A", sound: "melee-swing-1" },
    description: "A melee attack that deals extra fire damage to enemies",
  },
  fireball: {
    ...ball("fireball", 300, { visibleMs: 1000, sound: "spell-fireball" }),
    targets: ["enemy"],
    scale: { base: 0.15, perRank: 0.1 },
    description: "Deals fire damage to enemies this spell passes through.",
  },
  waterball: {
    ...ball("waterball", 200, { sound: "spell-water" }),
    targets: ["enemy"],
    description: "Deals water damage to enemies this spell passes through.",
  },
  lightball: {
    ...ball("lightball", 200, { sound: "spell-light" }),
    targets: ["enemy"],
    description: "Deals light damage to enemies this spell passes through.",
  },
  holyball: {
    ...ball("holyball", 200, { tint: "0xCCFFCC" }),
    targets: ["ally", "enemy"],
    cooldown: 5000,
    description: "Aim to shoot. Heals allies and burns enemies.",
  },
  quake: {
    delivery: { type: "burst", shape: "box", size: 32, hitMs: 100 },
    targets: ["enemy"],
    cooldown: 3000,
    scale: { base: 0.35, perRank: 0.1 },
    npcRange: [0, 16],
    look: {
      visibleMs: 2000,
      layer: "below",
      sprite: { animation: "spell-anim-quake" },
      fades: true,
      sound: "spell-earth",
    },
    description: "Emits a ring of earth damage around hero. Damages enemies.",
  },
  evasion: aura("0xCCFFCC"),
  haste: { ...aura("0xCCFFFF"), cooldown: 30000 },
  brute: aura("0xFFCCCC"),
  endurance: aura("0xFFFFCC"),
  guard: { ...aura("0xCCDDFF"), description: "Grants increased defense while active." },
  genius: { ...aura("0xCCCCFF"), description: "Grants an increased MP pool while active." },
  regeneration: {
    ...aura("0xFFFFFF"),
    cooldown: 30000,
    description: "Grants HP regeneration while active.  Effects are boosted by caster spell power.",
  },
  stealth: {
    ...aura("0x777777"),
    targets: ["self"],
    cooldown: 20000,
    vanishes: true,
  },
} as const satisfies Readonly<Record<string, SpellDefinition>>;

export type SpellName = keyof typeof spellDetails;

/** A spell by name, or undefined for a name that isn't one. */
export function findSpell(name: string | undefined): SpellDefinition | undefined {
  return name && Object.hasOwn(spellDetails, name) ? spellDetails[name as SpellName] : undefined;
}
