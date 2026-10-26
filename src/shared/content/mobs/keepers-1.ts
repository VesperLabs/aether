import type { KeeperDefinition } from "./keeper-types";

export const keepers1 = {
  cat: {
    charClass: "warrior",
    profile: { userName: "Cat", race: "cat" },
    baseStats: { level: 1 },
    keeperData: {
      dialogues: {
        greet: "Meow. I take it this isn't the first time you've talked to a cat.",
      },
    },
    hitBoxSize: { width: 22, height: 22 },
  },
  dog: {
    charClass: "warrior",
    profile: { userName: "Dog", race: "dog" },
    baseStats: { level: 1 },
    keeperData: { dialogues: { greet: "Woof. Woof. Greetings adventurer!" } },
    hitBoxSize: { width: 22, height: 22 },
  },
  trista: {
    charClass: "rogue",
    profile: {
      userName: "Trista",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-4", tint: "0x886666" },
      gender: "female",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    abilities: { "1": ["spell", "common", "waterball"] },
    equipment: {
      handLeft: ["weapon", "common", "spear"],
      handRight: null,
      helmet: ["helmet", "set", "crabHat"],
      accessory: null,
      armor: ["armor", "common", "clothRobe"],
      pants: ["pants", "common", "clothPants"],
      boots: ["boots", "set", "crabWalkers"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Greetings, traveler! I am <strong>Trista</strong>, the Crab Warden, guardian of these shores. Be sure to join our <a target='_blank' href='https://discord.com/invite/yadDyqpb6D'>Discord</a> channel for updates. Looking for more info about the game? Check out our <a target='_blank' href='https://aether.onrender.com/items'>Wiki</a>.",
        quests:
          "Your readiness and willingness to confront these quests warms my heart, noble adventurer. Remember, the journey itself is as valuable as the destination. The sea watches over you, and with each trial you overcome, you shall forge your legend in the annals of this realm.",
        shop: "Ah, my tools of the sea are myriad. Also, you can sell me things by dragging them in to my shop.",
        home: "You can set your home here so that when you die, you respawn by the campfire.  Pretty convenient, huh?",
      },
      quests: ["crab-catching", "crab-claws", "fish-spearing", "find-tudwick"],
      shop: [
        { item: ["ranged", "common", "shortBow"], stock: 1 },
        { item: ["gloves", "common", "clothGloves"], stock: 1 },
        { item: ["armor", "common", "clothRobe"], stock: 1 },
        { item: ["pants", "common", "clothPants"], stock: 1 },
      ],
      home: { x: 1496, y: 2028 },
    },
  },
  sergio: {
    charClass: "cleric",
    profile: {
      userName: "Sergio",
      face: { texture: "face-1" },
      hair: { texture: "hair-5", tint: "0x553355" },
      whiskers: { texture: "whiskers-3", tint: "0x553355" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: ["weapon", "common", "katar"],
      handRight: ["weapon", "common", "katar"],
      helmet: null,
      accessory: null,
      armor: ["armor", "common", "bronzePlate"],
      pants: ["pants", "common", "clothPants"],
      boots: ["boots", "common", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Greetings, traveler! I am Sergio, the former keeper of this once-great river valley. The killer plants have overrun its beauty, but I still believe in its revival.",
        quests:
          "Understanding the intricacies of these plants holds the key to restoring the valley's lost splendor. Help me to gather samples and I'll reward you.",
        shop: "Check out my gardener's wares to equip yourself. Let's bring life back to this forgotten land!",
        home: "Please, make yourself at home.",
      },
      quests: ["orchid-gathering", "weed-wacker", "big-momma", "talk-derek"],
      shop: [
        { item: ["weapon", "common", "spikes"], stock: 1 },
        { item: ["weapon", "common", "staff"], stock: 1 },
        { item: ["weapon", "common", "tomahawk"], stock: 1 },
        { item: ["stackable", "common", "mediumHpPotion"], stock: 1 },
      ],
      home: { x: 1554, y: 664 },
    },
  },
  tudwick: {
    charClass: "warrior",
    profile: {
      userName: "Tudwick",
      face: { texture: "face-2", tint: "0xFFFFFF" },
      whiskers: { texture: "whiskers-2", tint: "0xFFFFFF" },
      tint: "0x888888",
      hair: { texture: "hair-1", tint: "0xFFFFFF" },
      gender: "male",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: ["ranged", "common", "shortBow"],
      handRight: null,
      helmet: ["helmet", "unique", "tudwicksCap"],
      accessory: null,
      gloves: ["gloves", "common", "clothGloves"],
      armor: null,
      pants: ["pants", "common", "clothPants"],
      boots: ["boots", "common", "leatherBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "Well, well, well, look who stumbled into my neck of the woods. I'm <strong>Tudwick</strong>, the forest ranger who defies the conventions of shirts and embraces the wildness of nature. What brings you here, brave traveler? ",
        quests:
          "Ah, still interested, are ya? Well, I've got some intriguing tasks lined up for you, perfect for an adventurous soul like yourself.",
        shop: "Behold! I've gathered a curious collection of forest finds on my woodland wanderings. Feast your eyes upon these treasures I've stumbled upon. Who knows? You might find them rather handy on your own journey.",
        home: "These woods make a great home.",
      },
      quests: ["slime-roundup", "slime-eggs", "hornet-hunting", "find-lynne"],
      shop: [
        { item: ["boots", "common", "clothBoots"], stock: 1 },
        { item: ["shield", "common", "barkShield"], stock: 1 },
        { item: ["weapon", "common", "dagger"], stock: 1 },
      ],
      home: { x: 253, y: 581 },
    },
  },
  lynne: {
    charClass: "rogue",
    profile: {
      userName: "Lynne",
      face: { texture: "face-1", tint: "0xFFFFFF" },
      hair: { texture: "hair-1", tint: "0xDD6644" },
      gender: "female",
      race: "human",
    },
    state: { isStatic: true },
    baseStats: { level: 50 },
    equipment: {
      handLeft: null,
      handRight: ["weapon", "common", "scythe"],
      helmet: null,
      accessory: null,
      gloves: ["gloves", "common", "clothGloves"],
      armor: ["armor", "unique", "theMossmanProphecy"],
      pants: ["pants", "common", "clothPants"],
      boots: ["boots", "common", "clothBoots"],
    },
    keeperData: {
      dialogues: {
        greet:
          "My name is <strong>Lynne</strong>.  I am trying to film a nature documentary out here, but the critters keep attacking me.",
        quests:
          "In these woods, good production assistants don't grow on trees. Sure, I've got some jobs for you.",
        shop: "Some useful goods here. I take gold.",
        home: "Please make your self at home.",
      },
      quests: ["raccoon-hunting", "grape-finding", "hawkwing-hunting", "shrooms"],
      shop: [
        { item: ["weapon", "common", "scythe"], stock: 1 },
        { item: ["armor", "common", "clothCoat"], stock: 1 },
      ],
      home: { x: 442, y: 567 },
    },
  },
} as const satisfies Readonly<Record<string, KeeperDefinition>>;
