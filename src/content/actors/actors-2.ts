import type { ActorDefinition } from "./actor-types";

export const actors2 = {
  anthony: {
    flavor:
      "The Lunchmeat Sage. He has tasted every cured meat known to the realm, and hunts the caves for more.",
    charClass: "warrior",
    profile: {
      userName: "Anthony",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-1", tint: "0xDDDD88" },
      gender: "male",
      race: "human",
    },
    behaviors: { guard: {} },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: { key: "hatchet", slots: 2 },
      helmet: "chefHat",
      accessory: null,
      gloves: "clothGloves",
      pants: "chetsChampions",
      armor: "chetsPurpleShirt",
      boots: "chetsNeonKicks",
    },
    dialogues: {
      greet:
        "Greetings, kind traveler! I am <strong>Anthony</strong>, renowned as <strong>The Lunchmeat Sage</strong>. Throughout my gastronomic journey, I have savored the essence of every lunchmeat known to humankind.",
      quests:
        "These caves are dark and scary, but they are chuck full of great lunchmeats. You have to just know where to look.",
      shop: "Step into my humble abode, where you shall find an array of useful goods, all available for the exchange of shiny coins.",
    },
    quests: ["spidermeat-finding", "batmeat-finding", "cheese-finding", "hogan-hunting"],
    shop: [
      { item: "sword", stock: 1 },
      { item: "woodenBuckler", stock: 1 },
      { item: "mushroom", stock: 1 },
    ],
  },
  steve: {
    flavor:
      "The master of the town forge. Half the armour on the road came off his anvil, still warm.",
    charClass: "warrior",
    profile: {
      userName: "Steve",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-2", tint: "0x665555" },
      gender: "male",
      race: "human",
    },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: "hammer",
      helmet: null,
      accessory: null,
      gloves: "leatherBracers",
      pants: "leatherPants",
      armor: "bronzeHeavyPlate",
      boots: "leatherBoots",
    },
    dialogues: {
      greet: "Hail, traveler! I am <strong>Steve</strong>, the master of the forge in these parts.",
      shop: "Step up, my friend, and behold the treasures I've crafted, worth their weight in gleaming gold.",
      quests:
        "Seeking adventure, are you? There's always something to stir the blood and test the mettle of a daring soul.",
    },
    quests: ["wyrm-blade", "shell-finding", "skull-finding"],
    shop: [
      { item: "woodenBuckler", stock: 1 },
      { item: "leatherPants", stock: 1 },
      { item: "leatherBracers", stock: 1 },
      { item: "leatherCoat", stock: 1 },
      { item: "bronzePlate", stock: 1 },
      { item: "bronzeHeavyPlate", stock: 1 },
      { item: "leatherBoots", stock: 1 },
      { item: "cudgel", stock: 1 },
    ],
  },
  siobhan: {
    flavor:
      "A gentle spirit who brews potions for weary travelers. No one has ever seen her hurry.",
    charClass: "mage",
    profile: {
      userName: "Siobhan",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-2", tint: "0xCCCC55" },
      gender: "female",
      race: "human",
    },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: "shortBow",
      helmet: null,
      accessory: null,
      pants: "clothPants",
      armor: "clothRobe",
      boots: "clothBoots",
    },
    dialogues: {
      greet:
        "Greetings, dear child. I am <strong>Siobhan</strong>, the nurturing spirit, here to offer my wondrous potions.",
      quests: "Embark on sacred journeys, my child, to awaken harmony within your soul.",
      shop: "Behold the gifts of nature, my precious one. Find solace in the potion that calls to your heart.",
    },
    quests: [],
    shop: [
      { item: "smallHpPotion", stock: 1 },
      { item: "smallMpPotion", stock: 1 },
      { item: "mediumHpPotion", stock: 1 },
      { item: "mediumMpPotion", stock: 1 },
    ],
  },
  danny: {
    flavor:
      "A grand and slightly theatrical wizard. He guards his robe more fiercely than any spellbook.",
    charClass: "mage",
    profile: {
      userName: "Danny",
      face: { texture: "face-3", tint: "0xFFFF00" },
      whiskers: { texture: "whiskers-1", tint: "0xFFFF00" },
      hair: { texture: "hair-2", tint: "0xFFFF66" },
      gender: "male",
      race: "human",
    },
    baseStats: { level: 50 },
    abilities: { "1": "fireball" },
    equipment: {
      handLeft: "rod",
      handRight: null,
      helmet: null,
      accessory: null,
      gloves: "wizardGloves",
      pants: "leatherPants",
      armor: { key: "wizardRobe", slots: 3 },
      boots: { key: "leatherBoots", slots: 3 },
    },
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
      { item: "wand", stock: 1 },
      { item: "waterball", stock: 1 },
      { item: "endurance", stock: 1 },
      { item: "evasion", stock: 1 },
      { item: "brute", stock: 1 },
    ],
    home: { x: 1087, y: 1396 },
  },
  rae: {
    flavor:
      "A curious naturalist studying the creatures of these lands. Her basket is always full of samples.",
    charClass: "cleric",
    profile: {
      userName: "Rae",
      face: { texture: "face-1" },
      hair: { texture: "hair-4", tint: "0xFF6666" },
      gender: "female",
      race: "human",
    },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: "foxBlade",
      helmet: null,
      accessory: "compoundLenses",
      gloves: "flamingFinger",
      pants: "leatherPants",
      armor: "leatherCoat",
      boots: "leatherBoots",
    },
    dialogues: {
      greet: "My name is Rae. I'm a bit curious about some of the fauna in these lands.",
      shop: "I've got some curiousities for sale you may find useful.",
      quests: "I'm pretty busy here in town, but there are some things you can collect for me.",
    },
    quests: ["fauna-gatherer", "shitake-search", "talk-sergio"],
    shop: [
      { item: "scimitar", stock: 1 },
      { item: "clothCoat", stock: 1 },
    ],
  },
  ale: {
    flavor:
      "A cheerful merchant who sells fresh fruit and vegetables in town. Her prices are fair, her Spanish fast.",
    charClass: "rogue",
    profile: {
      userName: "Ale",
      face: { texture: "face-1" },
      hair: { texture: "hair-3", tint: "0xCC9966" },
      gender: "female",
      race: "human",
    },
    behaviors: { guard: {} },
    baseStats: { level: 50 },
    equipment: {
      handLeft: "cudgel",
      handRight: null,
      helmet: null,
      accessory: null,
      gloves: "silkGloves",
      pants: "leatherPants",
      armor: "clothRobe",
      boots: "chickenFeet",
    },
    dialogues: {
      greet: "Hola, mi nombre es <strong>Ale</strong>. Vendo frutas y verduras frescas.",
      shop: "¡Ven a probar estas maravillas del sabor y la diversión!",
      quests: "¡Aventuras y desafíos mágicos te esperan en estas misiones asombrosas!",
    },
    quests: [],
    shop: [
      { item: "carrot", stock: 1 },
      { item: "redApple", stock: 1 },
      { item: "orange", stock: 1 },
      { item: "grapes", stock: 1 },
    ],
  },
  derek: {
    flavor:
      "The ranger of the Aery Peaks. His campfire is the only warm place for miles, and he shares it freely.",
    charClass: "warrior",
    profile: {
      userName: "Derek",
      face: { texture: "face-2" },
      hair: { texture: "hair-5", tint: "0x665555" },
      whiskers: { texture: "whiskers-1", tint: "0x665555" },
      gender: "male",
      race: "human",
    },
    behaviors: { guard: {} },
    baseStats: { level: 50 },
    equipment: {
      handLeft: "cleaver",
      handRight: "woodenBuckler",
      helmet: null,
      accessory: null,
      armor: "couriersCamouflage",
      pants: "ferrousLeggings",
      boots: "leatherBoots",
    },
    dialogues: {
      greet:
        "Well met, traveler! Welcome to the Aery Peaks, where I answer to the name Derek. As the ranger overseeing these lands, I invite you to share in the warmth of our campfire. Many a task awaits the willing.",
      quests: "Time to make your mark, my friend. Here are things you can do for me.",
      shop: "Prepare to be intrigued. Feast your eyes on what I've gathered for sale.",
      home: "It's not much, but sure -- You can make my campfire your home if you want.",
    },
    quests: ["ice-crab-claws", "wolf-pelts", "wolf-culling"],
    shop: [
      { item: "tomahawk", stock: 1 },
      { item: "mediumHpPotion", stock: 1 },
    ],
    home: { x: 560, y: 597 },
  },
} as const satisfies Readonly<Record<string, ActorDefinition>>;
