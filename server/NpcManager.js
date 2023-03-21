import crypto from "crypto";
import Npc from "./Npc";

const POTION_DROP_RATE = 15;

class NpcManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.npcs = scene.physics.add.group();
  }
  spawnNpcs() {
    const { room } = this;
    const npcs = mapNpcs[room.name];
    for (const npc of npcs) {
      const mobData = mobTypes[npc.name];
      this.create({
        moveRange: 1,
        room,
        kind: npc?.kind,
        x: npc?.x,
        y: npc?.y,
        startingCoords: { x: npc?.x, y: npc?.y },
        ...mobData,
      });
    }
  }
  create(user) {
    const { scene, room, npcs } = this;
    const id = crypto.randomUUID();
    scene.npcs[id] = new Npc(scene, { id, room, ...user });
    scene.add.existing(scene.npcs[id]);
    npcs.add(scene.npcs[id]);
  }
  setNpcCollision() {
    const { scene, room, npcs } = this;
    scene.physics.add.collider(npcs, room.playerManager.players);
    room.colliders.forEach((c) => {
      scene.physics.add.collider(npcs, c);
    });
  }
}

const mobTypes = {
  /* Level 1 */
  raccoon: {
    profile: { race: "raccoon", headY: -27, userName: "Raccoon" },
    baseStats: {
      attackDelay: 500,
      expValue: 2,
      level: 1,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 1,
      strength: 1,
      vitality: 6,
      intelligence: 1,
      defense: 0,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 0,
      critMultiplier: 2,
      maxDamage: 1,
      minDamage: 2,
      regenHp: 1,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "redApple",
        chance: 4,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "grapes",
        chance: 4,
      },
    ],
  },
  slime: {
    profile: { race: "slime", headY: -23, userName: "Slime" },
    baseStats: {
      attackDelay: 500,
      expValue: 2,
      level: 1,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 3,
      strength: 3,
      vitality: 3,
      intelligence: 3,
      defense: 0,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 0,
      critMultiplier: 2,
      maxDamage: 1,
      minDamage: 0,
      regenHp: 1,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "blueSporangium",
        chance: 2,
      },
    ],
  },
  hornet: {
    profile: { race: "bee", headY: -34, userName: "Hornet" },
    baseStats: {
      attackDelay: 500,
      expValue: 1,
      level: 1,
      speed: 150,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 2,
      strength: 0,
      vitality: 3,
      intelligence: 3,
      defense: 0,
      blockChance: 0,
      dodgeChance: 35,
      critChance: 0,
      critMultiplier: 2,
      maxDamage: 0,
      minDamage: 0,
      regenHp: 1,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "redApple",
        chance: 4,
      },
    ],
  },
  /* Level 5 */
  hawkwing: {
    profile: { race: "bee", tint: "0x44FFCC", scale: 1.5, headY: -45, userName: "Hawkwing" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 5,
      level: 5,
      speed: 150,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 6,
      strength: 5,
      vitality: 6,
      intelligence: 3,
      defense: 0,
      blockChance: 0,
      dodgeChance: 45,
      critChance: 5,
      critMultiplier: 2,
      maxDamage: 1,
      minDamage: 2,
      regenHp: 5,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [],
  },
  spider: {
    profile: { race: "spider", headY: -21, userName: "Spider" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 4,
      level: 5,
      speed: 100,
      range: 32,
      accuracy: 3,
      armorPierce: 0,
      dexterity: 6,
      strength: 6,
      vitality: 9,
      intelligence: 3,
      defense: 0,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 1,
      critMultiplier: 2,
      maxDamage: 3,
      minDamage: 5,
      regenHp: 1,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "spiderMeat",
        chance: 3,
      },
    ],
  },
  hogan: {
    profile: { race: "spider", tint: "0xFF33CC", scale: 2, headY: -30, userName: "Hogan" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 10,
      level: 10,
      speed: 100,
      range: 32,
      accuracy: 3,
      armorPierce: 0,
      dexterity: 12,
      strength: 12,
      vitality: 22,
      intelligence: 10,
      defense: 0,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 1,
      critMultiplier: 2,
      maxDamage: 5,
      minDamage: 8,
      regenHp: 10,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "spiderMeat",
        chance: 3,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "cheese",
        chance: 6,
      },
    ],
  },
  bat: {
    profile: { race: "bat", headY: -30, userName: "Bat" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 4,
      level: 5,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 6,
      strength: 3,
      vitality: 3,
      intelligence: 6,
      defense: 5,
      blockChance: 0,
      dodgeChance: 35,
      critChance: 0,
      critMultiplier: 2,
      maxDamage: 2,
      minDamage: 3,
      regenHp: 1,
      regenMp: 1,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "batMeat",
        chance: 3,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "cheese",
        chance: 6,
      },
    ],
  },
  /* Level 10 */
  zombie: {
    profile: { race: "zombie", headY: -44, userName: "Zombie" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 8,
      level: 10,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 6,
      strength: 10,
      vitality: 25,
      intelligence: 8,
      defense: 0,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 0,
      critMultiplier: 2,
      maxDamage: 5,
      minDamage: 10,
      regenHp: 5,
      regenMp: 5,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "mediumHpPotion",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "skull",
        chance: 4,
      },
    ],
  },
  wraith: {
    profile: { race: "wraith", headY: -46, userName: "Wraith" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 8,
      level: 10,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 12,
      strength: 10,
      vitality: 20,
      intelligence: 17,
      defense: 0,
      blockChance: 0,
      dodgeChance: 5,
      critChance: 5,
      critMultiplier: 2,
      maxDamage: 5,
      minDamage: 8,
      regenHp: 5,
      regenMp: 5,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "mediumHpPotion",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "smallHpPotion",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "skull",
        chance: 4,
      },
    ],
  },
  chonks: {
    profile: { race: "abomination", tint: "0x88FF88", headY: -88, userName: "Chonks" },
    state: { isAggro: true },
    baseStats: {
      attackDelay: 500,
      expValue: 12,
      level: 15,
      speed: 100,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 18,
      strength: 20,
      vitality: 40,
      intelligence: 30,
      defense: 15,
      blockChance: 0,
      dodgeChance: 0,
      critChance: 5,
      critMultiplier: 1.5,
      maxDamage: 6,
      minDamage: 10,
      regenHp: 5,
      regenMp: 5,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [
      {
        type: "stackable",
        rarity: "common",
        key: "mediumHpPotion",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "smallHpPotion",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "skull",
        chance: 6,
      },
    ],
  },
  merman: {
    profile: { race: "merman", headY: -30, userName: "Merman" },
    state: { isAggro: false },
    baseStats: {
      attackDelay: 500,
      expValue: 8,
      level: 10,
      speed: 150,
      range: 32,
      accuracy: 0,
      armorPierce: 0,
      dexterity: 12,
      strength: 10,
      vitality: 20,
      intelligence: 17,
      defense: 0,
      blockChance: 0,
      dodgeChance: 5,
      critChance: 5,
      critMultiplier: 2,
      maxDamage: 5,
      minDamage: 8,
      regenHp: 5,
      regenMp: 5,
      maxHp: 0,
      maxMp: 0,
    },
    drops: [],
  },
};

const mapNpcs = {
  grassland: [
    { name: "hornet", x: 512, y: 640, kind: "nasty" },
    { name: "hornet", x: 512, y: 640, kind: "nasty" },
    { name: "raccoon", x: 512, y: 640, kind: "nasty" },
    { name: "merman", x: 712, y: 640, kind: "nasty" },
    { name: "slime", x: 512, y: 640, kind: "nasty" },
    { name: "slime", x: 512, y: 640, kind: "nasty" },
    { name: "slime", x: 512, y: 640, kind: "nasty" },
    { name: "slime", x: 512, y: 640, kind: "nasty" },
    { name: "slime", x: 512, y: 640, kind: "nasty" },
    // { name: "tudwick", x: 240, y: 880, kind: "keeper" },
  ],
  "grassland-2": [
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hornet", x: 944, y: 624, kind: "nasty" },
    { name: "hawkwing", x: 944, y: 624, kind: "nasty" },
    { name: "raccoon", x: 176, y: 176, kind: "nasty" },
    { name: "raccoon", x: 176, y: 176, kind: "nasty" },
    { name: "raccoon", x: 176, y: 176, kind: "nasty" },
    { name: "raccoon", x: 176, y: 176, kind: "nasty" },
    { name: "raccoon", x: 176, y: 176, kind: "nasty" },
    { name: "raccoon", x: 512, y: 640, kind: "nasty" },
    { name: "raccoon", x: 512, y: 640, kind: "nasty" },
    { name: "raccoon", x: 512, y: 640, kind: "nasty" },
    { name: "raccoon", x: 512, y: 640, kind: "nasty" },
    // { name: "lynne", x: 400, y: 560, kind: "keeper" },
  ],
  mine: [
    { name: "bat", x: 848, y: 1808, kind: "nasty" },
    { name: "bat", x: 848, y: 1808, kind: "nasty" },
    { name: "bat", x: 848, y: 1808, kind: "nasty" },
    { name: "spider", x: 848, y: 1808, kind: "nasty" },
    { name: "spider", x: 848, y: 1808, kind: "nasty" },
    { name: "spider", x: 848, y: 1808, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 912, y: 528, kind: "nasty" },
    { name: "bat", x: 912, y: 528, kind: "nasty" },
    { name: "bat", x: 912, y: 528, kind: "nasty" },
    { name: "bat", x: 912, y: 528, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "spider", x: 1680, y: 2160, kind: "nasty" },
    { name: "bat", x: 1680, y: 2160, kind: "nasty" },
    { name: "bat", x: 1680, y: 2160, kind: "nasty" },
    { name: "bat", x: 1680, y: 2160, kind: "nasty" },
    { name: "bat", x: 176, y: 1872, kind: "nasty" },
    // { name: "anthony", x: 400, y: 2256, kind: "keeper" },
    { name: "hogan", x: 1872, y: 976, kind: "nasty" },
  ],
  town: [
    //{ name: "danny", x: 1072, y: 1296, kind: "keeper" }
  ],
  townInside: [
    // { name: "steve", x: 1712, y: 1168, kind: "keeper" },
    //{ name: "siobhan", x: 496, y: 976, kind: "keeper" },
  ],
  "grassland-graveyard": [
    { name: "wraith", x: 496, y: 336, kind: "nasty" },
    { name: "wraith", x: 496, y: 336, kind: "nasty" },
    { name: "wraith", x: 496, y: 336, kind: "nasty" },
    { name: "zombie", x: 496, y: 336, kind: "nasty" },
    { name: "zombie", x: 496, y: 336, kind: "nasty" },
    { name: "zombie", x: 496, y: 336, kind: "nasty" },
    { name: "chonks", x: 1049, y: 368, kind: "nasty" },
  ],
  "dungeon-aqueducts": [{ name: "wraith", x: 176, y: 1488, kind: "nasty" }],
};

export { mobTypes, mapNpcs };
export default NpcManager;
