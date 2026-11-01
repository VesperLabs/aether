import type { NastyDefinition } from "./mob-types";

export const nasties = {
  crab: {
    charClass: "mage",
    profile: { race: "crab", userName: "Crab", tint: "0xFF6600" },
    flavor:
      "A shore crab with a mean pinch and a meaner temper. Trista keeps their numbers down, but there are always more.",
    behaviors: ["retreat"],
    baseStats: { level: 1 },
    hitBoxSize: { width: 18, height: 16 },
    drops: [
      { type: "boots", rarity: "set", key: "crabWalkers", chance: 1000 },
      { type: "stackable", rarity: "common", key: "crabClaw", chance: 3 },
    ],
  },
  raccoon: {
    charClass: "warrior",
    profile: { race: "raccoon", userName: "Raccoon" },
    flavor:
      "A masked bandit of the grassland. It raids packs and campfires, and it will fight you for your snacks.",
    behaviors: ["retreat"],
    baseStats: { level: 3 },
    hitBoxSize: { width: 26, height: 24 },
    drops: [
      { type: "stackable", rarity: "common", key: "grapes", chance: 4 },
      { type: "stackable", rarity: "common", key: "smallHpPotion", chance: 10 },
    ],
  },
  slime: {
    charClass: "mage",
    profile: { race: "slime", userName: "Slime" },
    abilities: { "1": ["spell", "common", "lunge"] },
    flavor:
      "A wobbling blob that absorbs anything it touches. Nobody knows what it eats, only that it's always hungry.",
    baseStats: { level: 2 },
    hitBoxSize: { width: 24, height: 23 },
    drops: [{ type: "stackable", rarity: "common", key: "blueSporangium", chance: 3 }],
  },
  hornet: {
    charClass: "rogue",
    profile: { race: "bee", userName: "Hornet" },
    flavor:
      "Fat, angry and fast. You'll hear the buzzing long before you see it, and by then it's already too late.",
    baseStats: { level: 4, walkSpeed: 10 },
    hitBoxSize: { width: 18, height: 32 },
    drops: [{ type: "stackable", rarity: "common", key: "smallHpPotion", chance: 10 }],
  },
  fish: {
    charClass: "warrior",
    profile: { race: "fish", userName: "Fish", tint: "0x8899CC" },
    flavor:
      "Lynne swears it isn't natural. It flops out of the river on purpose, just to bite the ankles of passers-by.",
    state: { noWorldDrops: true },
    behaviors: ["shootsOverWalls"],
    abilities: { "1": ["spell", "common", "waterSpit"] },
    baseStats: { level: 1 },
    hitBoxSize: { width: 26, height: 24 },
    drops: [],
  },
  hawkwing: {
    charClass: "rogue",
    profile: { race: "bee", tint: "0x44FFCC", scale: 1.5, userName: "Hawkwing" },
    flavor:
      "A giant hornet that rules the skies over the peaks. Its wings are prized by hunters, if they survive.",
    behaviors: ["aggressive"],
    baseStats: { level: 6, walkSpeed: 20 },
    hitBoxSize: { width: 28, height: 48 },
    drops: [],
  },
  spider: {
    charClass: "warrior",
    profile: { race: "spider", userName: "Spider" },
    abilities: { "1": ["spell", "common", "lunge"] },
    flavor:
      "Eight legs, too many eyes and a taste for the unwary. It waits in the dark corners of the mine for prey.",
    behaviors: ["aggressive"],
    baseStats: { level: 5 },
    hitBoxSize: { width: 28, height: 22 },
    drops: [
      { type: "stackable", rarity: "common", key: "spiderMeat", chance: 3 },
      { type: "stackable", rarity: "common", key: "cheese", chance: 10 },
    ],
  },
  bat: {
    charClass: "mage",
    profile: { race: "bat", userName: "Bat" },
    flavor:
      "It squeaks in the dark, circles once, then comes straight for your neck. Rarely alone in the mine.",
    behaviors: ["aggressive"],
    baseStats: { level: 5 },
    hitBoxSize: { width: 18, height: 28 },
    drops: [
      { type: "stackable", rarity: "common", key: "batMeat", chance: 3 },
      { type: "stackable", rarity: "common", key: "cheese", chance: 10 },
    ],
  },
  hogan: {
    charClass: "warrior",
    profile: { race: "spider", tint: "0xFF33CC", scale: 2, userName: "Hogan" },
    flavor:
      "A monstrous pink spider. The webs around its lair are thick as rope and full of the last adventurers.",
    behaviors: ["aggressive"],
    baseStats: { level: 7 },
    hitBoxSize: { width: 50, height: 40 },
    drops: [
      { type: "stackable", rarity: "common", key: "spiderMeat", chance: 2 },
      { type: "stackable", rarity: "common", key: "cheese", chance: 10 },
    ],
  },
  zombie: {
    charClass: "warrior",
    profile: { race: "zombie", userName: "Zombie" },
    flavor:
      "The graveyard doesn't keep its dead for long. They wander slow and stubborn, and they never sleep.",
    behaviors: ["aggressive"],
    baseStats: { level: 6 },
    hitBoxSize: { width: 22, height: 43 },
    drops: [
      { type: "stackable", rarity: "common", key: "mediumHpPotion", chance: 10 },
      { type: "stackable", rarity: "common", key: "skull", chance: 4 },
    ],
  },
  wraith: {
    charClass: "mage",
    profile: { race: "wraith", userName: "Wraith" },
    flavor:
      "A restless spirit that drifts through walls and steals the warmth from anyone foolish enough to linger.",
    behaviors: ["aggressive"],
    baseStats: { level: 7 },
    hitBoxSize: { width: 22, height: 43 },
    drops: [
      { type: "stackable", rarity: "common", key: "mediumHpPotion", chance: 10 },
      { type: "stackable", rarity: "common", key: "skull", chance: 4 },
    ],
  },
  chonks: {
    charClass: "cleric",
    profile: { race: "abomination", tint: "0x88FF88", userName: "Chonks" },
    flavor:
      "A lumbering abomination stitched from something better left buried. Slow, but it hits like a cart.",
    behaviors: ["aggressive"],
    baseStats: { level: 10 },
    hitBoxSize: { width: 58, height: 85 },
    drops: [
      { type: "stackable", rarity: "common", key: "mediumHpPotion", chance: 10 },
      { type: "stackable", rarity: "common", key: "skull", chance: 4 },
    ],
  },
  merman: {
    charClass: "mage",
    profile: { race: "merman", userName: "Merman" },
    flavor:
      "One of the river folk. They turned hostile when the valley fell, and now they guard what's left of it.",
    behaviors: ["aggressive", "kite"],
    baseStats: { level: 8, waterResistance: 50 },
    hitBoxSize: { width: 24, height: 32 },
    abilities: { "1": ["spell", "common", "fireball"] },
    drops: [{ type: "stackable", rarity: "common", key: "shell", chance: 3 }],
  },
  wyrm: {
    charClass: "warrior",
    profile: { race: "wyrm", userName: "Wyrm", scale: 2 },
    flavor:
      "The great serpent of the aqueducts. Its scales are worth a fortune, if you can live long enough to take one.",
    behaviors: ["aggressive"],
    baseStats: { level: 11, minFireDamage: 1, maxFireDamage: 2, fireResistance: 50 },
    hitBoxSize: { width: 50, height: 78 },
    abilities: { "1": ["spell", "common", "fireball3"] },
    drops: [
      { type: "stackable", rarity: "unique", key: "wyrmScale", chance: 4 },
      { type: "shield", rarity: "unique", key: "wyrmScaleWard", chance: 2000 },
    ],
  },
  orchid: {
    charClass: "rogue",
    profile: { race: "orchid", userName: "Orchid" },
    flavor:
      "One of the killer plants that overran Sergio's valley. Pretty from a distance, all teeth up close.",
    behaviors: ["aggressive"],
    baseStats: { level: 9, earthResistance: 25, fireResistance: -15 },
    hitBoxSize: { width: 26, height: 24 },
    drops: [{ type: "stackable", rarity: "common", key: "orchidFlower", chance: 4 }],
  },
  earthElemental: {
    charClass: "mage",
    profile: { race: "earth-elemental", userName: "Earth Elemental" },
    flavor:
      "Living stone, woken deep in the mine. It moves slowly and hits like a falling ceiling.",
    baseStats: {
      level: 12,
      minEarthDamage: 1,
      maxEarthDamage: 2,
      earthResistance: 50,
      fireResistance: 50,
      waterResistance: -50,
    },
    hitBoxSize: { width: 26, height: 42 },
    drops: [
      { type: "stackable", rarity: "unique", key: "goldOre", chance: 20 },
      { type: "stackable", rarity: "magic", key: "ginseng", chance: 10 },
      { type: "stackable", rarity: "common", key: "leaves", chance: 4 },
      { type: "stackable", rarity: "common", key: "stone", chance: 4 },
    ],
    abilities: { "1": ["spell", "common", "quake"] },
  },
  bigMomma: {
    charClass: "rogue",
    profile: { race: "orchid", userName: "Big Momma", scale: 3, tint: "0x8888FF" },
    flavor: "The mother of all killer plants. Every orchid in the valley sprouted from her roots.",
    behaviors: ["aggressive"],
    baseStats: {
      level: 13,
      walkSpeed: 10,
      earthResistance: 50,
      fireResistance: -15,
      blockChance: 5,
    },
    hitBoxSize: { width: 78, height: 72 },
    drops: [],
  },
  wolf: {
    charClass: "rogue",
    profile: { race: "wolf", userName: "Wolf", tint: "0xCCBBAA" },
    abilities: { "1": ["spell", "common", "lunge"] },
    flavor:
      "Grey wolves hunt in packs across the peaks. Where you see one, the rest are already circling.",
    behaviors: ["aggressive"],
    baseStats: { level: 10, walkSpeed: 20 },
    hitBoxSize: { width: 31, height: 28 },
    drops: [{ type: "stackable", rarity: "common", key: "wolfPelt", chance: 2 }],
  },
  whiteFang: {
    charClass: "rogue",
    profile: { race: "wolf", userName: "White Fang", scale: 1.5 },
    flavor:
      "The leader of the peak wolves. Bigger and faster than the rest, and never alone for long.",
    behaviors: ["aggressive"],
    baseStats: { level: 12, maxHp: 300, walkSpeed: 20 },
    hitBoxSize: { width: 41, height: 38 },
    abilities: { "1": ["spell", "common", "stealth"], "2": ["spell", "common", "lunge"] },
    drops: [{ type: "stackable", rarity: "common", key: "wolfPelt", chance: 2 }],
  },
  bear: {
    charClass: "cleric",
    profile: { race: "bear", userName: "Bear", tint: "0xAA7744" },
    flavor: "A huge brown bear that wanders the forest edge. Never get between it and a beehive.",
    behaviors: ["aggressive"],
    baseStats: { level: 11, walkSpeed: 10 },
    hitBoxSize: { width: 36, height: 38 },
    drops: [{ type: "stackable", rarity: "common", key: "bearSteak", chance: 3 }],
  },
  iceCrab: {
    charClass: "mage",
    profile: { race: "crab", userName: "Ice Crab", tint: "0x8899CC" },
    flavor:
      "A crab from the frozen shore. Its claws are cold enough to burn, and its shell turns most blades.",
    behaviors: ["kite"],
    baseStats: { level: 9, waterResistance: 50 },
    hitBoxSize: { width: 18, height: 16 },
    abilities: { "1": ["spell", "common", "waterball"], "2": ["spell", "common", "guard"] },
    drops: [
      { type: "armor", rarity: "unique", key: "iceCrabShell", chance: 1000 },
      { type: "stackable", rarity: "common", key: "iceCrabClaw", chance: 3 },
    ],
  },
} as const satisfies Readonly<Record<string, NastyDefinition>>;

export type NastyId = keyof typeof nasties;
