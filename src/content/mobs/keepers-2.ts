import type { KeeperDefinition } from "./keeper-types";

export const keepers2 = {
  anthony: {
    charClass: "warrior",
    profile: {
      userName: "Anthony",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-1", tint: "0xDDDD88" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: ["weapon", "magic", "hatchet"],
      helmet: ["helmet", "unique", "chefHat"],
      accessory: null,
      gloves: ["gloves", "common", "clothGloves"],
      pants: ["pants", "set", "chetsChampions"],
      armor: ["armor", "set", "chetsPurpleShirt"],
      boots: ["boots", "set", "chetsNeonKicks"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Greetings, kind traveler! I am <strong>Anthony</strong>, renowned as <strong>The Lunchmeat Sage</strong>. Throughout my gastronomic journey, I have savored the essence of every lunchmeat known to humankind.",
        quests:
          "These caves are dark and scary, but they are chuck full of great lunchmeats. You have to just know where to look.",
        shop: "Step into my humble abode, where you shall find an array of useful goods, all available for the exchange of shiny coins.",
      },
      quests: ["spidermeat-finding", "batmeat-finding", "cheese-finding", "hogan-hunting"],
      shop: [
        { item: ["weapon", "common", "sword"], stock: 1 },
        { item: ["shield", "common", "woodenBuckler"], stock: 1 },
        { item: ["stackable", "common", "mushroom"], stock: 1 },
      ],
    },
  },
  steve: {
    charClass: "warrior",
    profile: {
      userName: "Steve",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-2", tint: "0x665555" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: false },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: ["weapon", "common", "hammer"],
      helmet: null,
      accessory: null,
      gloves: ["gloves", "common", "leatherBracers"],
      pants: ["pants", "common", "leatherPants"],
      armor: ["armor", "common", "bronzeHeavyPlate"],
      boots: ["boots", "common", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Hail, traveler! I am <strong>Steve</strong>, the master of the forge in these parts.",
        shop: "Step up, my friend, and behold the treasures I've crafted, worth their weight in gleaming gold.",
        quests:
          "Seeking adventure, are you? There's always something to stir the blood and test the mettle of a daring soul.",
      },
      quests: ["wyrm-blade", "shell-finding", "skull-finding"],
      shop: [
        { item: ["shield", "common", "woodenBuckler"], stock: 1 },
        { item: ["pants", "common", "leatherPants"], stock: 1 },
        { item: ["gloves", "common", "leatherBracers"], stock: 1 },
        { item: ["armor", "common", "leatherCoat"], stock: 1 },
        { item: ["armor", "common", "bronzePlate"], stock: 1 },
        { item: ["armor", "common", "bronzeHeavyPlate"], stock: 1 },
        { item: ["boots", "common", "leatherBoots"], stock: 1 },
        { item: ["weapon", "common", "cudgel"], stock: 1 },
      ],
    },
  },
  siobhan: {
    charClass: "mage",
    profile: {
      userName: "Siobhan",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-2", tint: "0xCCCC55" },
      gender: "female",
      race: "human",
    },
    state: { isStatic: false },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: ["ranged", "common", "shortBow"],
      helmet: null,
      accessory: null,
      pants: ["pants", "common", "clothPants"],
      armor: ["armor", "common", "clothRobe"],
      boots: ["boots", "common", "clothBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Greetings, dear child. I am <strong>Siobhan</strong>, the nurturing spirit, here to offer my wondrous potions.",
        quests: "Embark on sacred journeys, my child, to awaken harmony within your soul.",
        shop: "Behold the gifts of nature, my precious one. Find solace in the potion that calls to your heart.",
      },
      quests: [],
      shop: [
        { item: ["stackable", "common", "smallHpPotion"], stock: 1 },
        { item: ["stackable", "common", "smallMpPotion"], stock: 1 },
        { item: ["stackable", "common", "mediumHpPotion"], stock: 1 },
        { item: ["stackable", "common", "mediumMpPotion"], stock: 1 },
      ],
    },
  },
  danny: {
    charClass: "mage",
    profile: {
      userName: "Danny",
      face: { texture: "face-3", tint: "0xFFFF00" },
      whiskers: { texture: "whiskers-1", tint: "0xFFFF00" },
      hair: { texture: "hair-2", tint: "0xFFFF66" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: false },
    baseStats: { level: 50 },
    abilities: { "1": ["spell", "common", "fireball"] },
    equipment: {
      handLeft: ["weapon", "common", "rod"],
      handRight: null,
      helmet: null,
      accessory: null,
      gloves: ["gloves", "common", "wizardGloves"],
      pants: ["pants", "common", "leatherPants"],
      armor: ["armor", "rare", "wizardRobe"],
      boots: ["boots", "rare", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Greetings, mortals! I am <strong>Danny</strong>, the mystical wizard of these realms.",
        quests:
          "Behold! Mystical quests await, woven with the threads of magic, yet my robe remains beyond your grasp.",
        shop: "Only wizards may wield the enchanted garbs I possess. Yet, behold, I offer thee some mystical wares for sale.",
        home: "Setting your home here would be a wise choice!",
      },
      quests: ["talk-steve", "chonks-hunting", "zombie-hunting"],
      shop: [
        { item: ["weapon", "common", "wand"], stock: 1 },
        { item: ["spell", "common", "waterball"], stock: 1 },
        { item: ["spell", "common", "endurance"], stock: 1 },
        { item: ["spell", "common", "evasion"], stock: 1 },
        { item: ["spell", "common", "brute"], stock: 1 },
      ],
      home: { x: 1087, y: 1396 },
    },
  },
  rae: {
    charClass: "cleric",
    profile: {
      userName: "Rae",
      face: { texture: "face-1" },
      hair: { texture: "hair-4", tint: "0xFF6666" },
      gender: "female",
      race: "human",
    },
    state: { isStatic: false },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: ["weapon", "unique", "foxBlade"],
      helmet: null,
      accessory: ["accessory", "unique", "compoundLenses"],
      gloves: ["gloves", "unique", "flamingFinger"],
      pants: ["pants", "common", "leatherPants"],
      armor: ["armor", "common", "leatherCoat"],
      boots: ["boots", "common", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet: "My name is Rae. I'm a bit curious about some of the fauna in these lands.",
        shop: "I've got some curiousities for sale you may find useful.",
        quests: "I'm pretty busy here in town, but there are some things you can collect for me.",
      },
      quests: ["fauna-gatherer", "shitake-search", "talk-sergio"],
      shop: [
        { item: ["weapon", "common", "scimitar"], stock: 1 },
        { item: ["armor", "common", "clothCoat"], stock: 1 },
      ],
    },
  },
  ale: {
    charClass: "rogue",
    profile: {
      userName: "Ale",
      face: { texture: "face-1" },
      hair: { texture: "hair-3", tint: "0xCC9966" },
      gender: "female",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: ["weapon", "common", "cudgel"],
      handRight: null,
      helmet: null,
      accessory: null,
      gloves: ["gloves", "common", "silkGloves"],
      pants: ["pants", "common", "leatherPants"],
      armor: ["armor", "common", "clothRobe"],
      boots: ["boots", "unique", "chickenFeet"],
    },
    keeperData: {
      dialogues: {
        greet: "Hola, mi nombre es <strong>Ale</strong>. Vendo frutas y verduras frescas.",
        shop: "¡Ven a probar estas maravillas del sabor y la diversión!",
        quests: "¡Aventuras y desafíos mágicos te esperan en estas misiones asombrosas!",
      },
      quests: [],
      shop: [
        { item: ["stackable", "common", "carrot"], stock: 1 },
        { item: ["stackable", "common", "redApple"], stock: 1 },
        { item: ["stackable", "common", "orange"], stock: 1 },
        { item: ["stackable", "common", "grapes"], stock: 1 },
      ],
    },
  },
  derek: {
    charClass: "warrior",
    profile: {
      userName: "Derek",
      face: { texture: "face-2" },
      hair: { texture: "hair-5", tint: "0x665555" },
      whiskers: { texture: "whiskers-1", tint: "0x665555" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: ["weapon", "common", "cleaver"],
      handRight: ["shield", "common", "woodenBuckler"],
      helmet: null,
      accessory: null,
      armor: ["armor", "unique", "couriersCamouflage"],
      pants: ["pants", "unique", "ferrousLeggings"],
      boots: ["boots", "common", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Well met, traveler! Welcome to the Aery Peaks, where I answer to the name Derek. As the ranger overseeing these lands, I invite you to share in the warmth of our campfire. Many a task awaits the willing.",
        quests: "Time to make your mark, my friend. Here are things you can do for me.",
        shop: "Prepare to be intrigued. Feast your eyes on what I've gathered for sale.",
        home: "It's not much, but sure -- You can make my campfire your home if you want.",
      },
      quests: ["ice-crab-claws", "wolf-pelts", "wolf-culling"],
      shop: [
        { item: ["weapon", "common", "tomahawk"], stock: 1 },
        { item: ["stackable", "common", "mediumHpPotion"], stock: 1 },
      ],
      home: { x: 560, y: 597 },
    },
  },
} as const satisfies Readonly<Record<string, KeeperDefinition>>;
