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

/** A thrown ball, playing its own row of the `pokeball-roll` sheet as it flies. */
function thrownBall(animation: string) {
  return {
    /* Drawn at half its art's size (about 8px across), and it hits, and meets walls, as big as it
     * looks: a radius of size times scale, 4px */
    delivery: { type: "projectile", size: 8, speed: 200, range: 100 },
    scale: { base: 0.5 },
    targets: ["enemy"],
    pierces: false,
    /* Sinks a little into a wall before it turns back, and comes off it slower than it went in */
    ricochet: { depth: 8, bounciness: 0.6 },
    cooldown: 800,
    look: {
      visibleMs: 1000,
      layer: "above",
      sprite: { animation },
      upright: true,
      /* Comes down onto its shadow as its flight ends, then rolls on along the ground */
      shadow: true,
      spent: "rolls",
    },
    description: "Aim and throw it at a wild creature to try to catch it.",
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
    look: { visibleMs: 2000, layer: "above", sprite: { icon: "arrow" }, shadow: true },
  },
  tackle: {
    delivery: { type: "dash", size: 16, speed: 350, hitMs: 160 },
    targets: ["enemy"],
    cooldown: 2500,
    npcRange: [16, 48],
    look: { visibleMs: 160, layer: "below" },
    description: "Dash forward and tackle whoever you run through with your weapon.",
  },
  pounce: {
    delivery: { type: "dash", size: 16, speed: 350, hitMs: 160 },
    targets: ["enemy"],
    pounces: true,
    cooldown: 4000,
    // Further out than tackle: springs at a foe hovering just out of reach
    npcRange: [24, 72],
    look: { visibleMs: 160, layer: "below" },
    description: "Spring to where your prey is headed.",
  },
  "flame-slash": {
    delivery: { type: "swing", size: 16, hitMs: 120 },
    targets: ["enemy"],
    cooldown: 1000,
    look: {
      visibleMs: 300,
      layer: "below",
      tint: "0xFF7A2A",
      light: { color: "0xFF7A2A", radius: 40 },
      sound: "melee-swing-1",
    },
    description: "A melee attack that deals extra fire damage to enemies",
  },
  fireball: {
    ...ball("fireball", 300, {
      visibleMs: 1000,
      light: { color: "0xFF8A3A", radius: 56 },
      sound: "spell-fireball",
    }),
    targets: ["enemy"],
    scale: { base: 0.15, perRank: 0.1 },
    description: "Deals fire damage to enemies this spell passes through.",
  },
  waterball: {
    ...ball("waterball", 200, { light: { color: "0x4A8AD8", radius: 32 }, sound: "spell-water" }),
    targets: ["enemy"],
    description: "Deals water damage to enemies this spell passes through.",
  },
  lightball: {
    ...ball("lightball", 200, { light: { color: "0xFFF07A", radius: 64 }, sound: "spell-light" }),
    targets: ["enemy"],
    description: "Deals light damage to enemies this spell passes through.",
  },
  holyball: {
    ...ball("holyball", 200, { tint: "0xCCFFCC", light: { color: "0xCCFFCC", radius: 48 } }),
    targets: ["ally", "enemy"],
    cooldown: 5000,
    description: "Aim to shoot. Heals allies and burns enemies.",
  },
  quake: {
    delivery: { type: "burst", shape: "box", size: 32, hitMs: 100 },
    targets: ["enemy"],
    cooldown: 2000,
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
  /* Thrown balls: whoever one hits struggles in it (`capturing`), and may be caught when that ends */
  pokeball: thrownBall("pokeball-roll"),
  greatball: thrownBall("greatball-roll"),
  ultraball: thrownBall("ultraball-roll"),
  masterball: thrownBall("masterball-roll"),
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
