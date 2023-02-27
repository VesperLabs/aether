const Character = require("../client/src/Character");
const crypto = require("crypto");
const POTION_DROP_RATE = 15;

const mobTypes = {
  /* Level 1 */
  raccoon: {
    profile: { race: "raccoon" },
    name: "Raccoon",
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-apple",
        chance: 4,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-grapes",
        chance: 4,
      },
    ],
  },
  slime: {
    profile: { race: "slime" },
    name: "Slime",
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-bsporangium",
        chance: 2,
      },
    ],
  },
  hornet: {
    profile: { race: "bee" },
    name: "Hornet",
    baseStats: {
      expValue: 1,
      level: 1,
      speed: 100,
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
      critMultiplyer: 2,
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
        key: "common-stackable-apple",
        chance: 4,
      },
    ],
  },
  /* Level 5 */
  hawkwing: {
    profile: { race: "bee" },
    name: "Hawkwing",
    aggro: true,
    tint: "44FFCC",
    baseStats: {
      expValue: 5,
      level: 5,
      speed: 100,
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
      critMultiplyer: 2,
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
    profile: { race: "spider" },
    name: "Spider",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-spidermeat",
        chance: 3,
      },
    ],
  },
  hogan: {
    profile: { race: "spider" },
    tint: "FF6666",
    name: "Hogan",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-spidermeat",
        chance: 3,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-cheese",
        chance: 6,
      },
    ],
  },
  bat: {
    profile: { race: "bat" },
    name: "Bat",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-batmeat",
        chance: 3,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-cheese",
        chance: 6,
      },
    ],
  },
  /* Level 10 */
  zombie: {
    profile: { race: "zombie" },
    name: "Zombie",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-potionmediumhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-potionsmallhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-skull",
        chance: 4,
      },
    ],
  },
  wraith: {
    profile: { race: "wraith" },
    name: "Wraith",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
        key: "common-stackable-potionmediumhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-potionsmallhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-skull",
        chance: 4,
      },
    ],
  },
  chonks: {
    profile: { race: "abomination" },
    name: "Chonks",
    aggro: true,
    tint: "88FF88",
    baseStats: {
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
      critMultiplyer: 1.5,
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
        key: "common-stackable-potionmediumhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-potionsmallhp",
        chance: POTION_DROP_RATE,
      },
      {
        type: "stackable",
        rarity: "common",
        key: "common-stackable-skull",
        chance: 6,
      },
    ],
  },
  merman: {
    profile: { race: "merman" },
    name: "Merman",
    aggro: true,
    baseStats: {
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
      critMultiplyer: 2,
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
    { name: "slime", x: 512, y: 640, kind: "nasty" },
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
  town: [{ name: "danny", x: 1072, y: 1296, kind: "keeper" }],
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

function spawnNpcs(scene) {
  for (const mapRoom of Object.values(scene.mapRooms)) {
    const npcs = mapNpcs[mapRoom.name];
    for (const npc of npcs) {
      const npcData = mobTypes[npc.name];
      addNpc(scene, {
        //nameKey: name,
        //mapGrid: parentMap.mapGrid,
        moveRange: 1,
        room: mapRoom.name,
        x: npc?.x,
        y: npc?.y,
        // state: { isDead: false, isRobot: true, lockedUser: null },
        ...npcData,
      });
    }
  }
}

function addNpc(scene, npcData) {
  const id = crypto.randomUUID();
  scene.npcs[id] = new Npc(scene, { id, ...npcData });
  scene.add.existing(scene.npcs[id]);
  scene.mapRooms[npcData.room].npcs.add(scene.npcs[id]);
  return scene.npcs[id];
}

class Npc extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.mapRoom = scene.mapRooms[args.room];
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update(time, delta) {
    if (time % 4 > 1) return;
    const randNumber = Math.floor(Math.random() * 6 + 1);
    const speed = 100;
    switch (randNumber) {
      case 1:
        this.vx = -speed;
        this.direction = "left";
        break;
      case 2:
        this.vx = speed;
        this.direction = "right";
        break;
      case 3:
        this.vy = -speed;
        this.direction = "up";
        break;
      case 4:
        this.vy = speed;
        this.direction = "down";
        break;
      default:
        this.vy = 0;
        this.vx = 0;
    }
    this.body.setVelocity(this.vx, this.vy);
  }
}

module.exports = { mobTypes, mapNpcs, spawnNpcs };
