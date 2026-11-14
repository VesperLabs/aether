const hairSchema = {
  bsonType: "object",
  required: ["tint", "texture"],
  properties: {
    tint: {
      bsonType: "string",
      description: "must be a string and is required",
    },
    texture: {
      bsonType: "string",
      description: "must be a string and is required",
    },
  },
};

const faceSchema = {
  bsonType: "object",
  required: ["texture"],
  properties: {
    texture: {
      bsonType: "string",
      description: "must be a string and is required",
    },
  },
};

const userSettingsSchema = {
  bsonType: "object",
  properties: {
    playMusic: {
      bsonType: "bool",
      description: "must be a boolean",
    },
    showMinimap: {
      bsonType: "bool",
      description: "must be a boolean",
    },
  },
};

const spawnSchema = {
  bsonType: "object",
  required: ["x", "y", "roomName"],
  properties: {
    x: {
      bsonType: "number",
      description: "must be a number and is required",
    },
    y: {
      bsonType: "number",
      description: "must be a number and is required",
    },
    roomName: {
      bsonType: "string",
      description: "must be a string and is required",
    },
  },
};

const profileSchema = {
  bsonType: "object",
  required: ["race", "userName"],
  properties: {
    userNameTint: {
      bsonType: "string",
      description: "must be a string",
    },
    userName: {
      bsonType: "string",
      description: "must be a string and is required",
    },
    race: {
      bsonType: "string",
      description: "must be a string and is required",
    },
    tint: {
      bsonType: "string",
      description: "must be a string",
    },
    scale: {
      bsonType: "number",
      description: "must be a number",
    },
    hair: hairSchema,
    face: faceSchema,
    whiskers: hairSchema,
  },
};

/** An item as `saved-item.ts` saves it: gear by id, key and mods, stackables by key and amount. */
const savedItemSchema = {
  bsonType: ["object", "null"],
  required: ["key"],
  properties: {
    id: { bsonType: "string" },
    key: { bsonType: "string" },
    amount: { bsonType: "number" },
    mods: { bsonType: "array", items: { bsonType: ["string", "null"] } },
    items: { bsonType: "array" },
  },
  additionalProperties: false,
};

const itemSlotsSchema = {
  bsonType: "object",
  additionalProperties: savedItemSchema,
};

const userSchema = {
  bsonType: "object",
  required: ["x", "y", "roomName", "baseStats", "updatedAt"],
  properties: {
    x: {
      bsonType: "number",
      description: "must be a number and is required",
    },
    y: {
      bsonType: "number",
      description: "must be a number and is required",
    },
    roomName: {
      bsonType: "string",
      description: "must be a string and is required",
    },
    direction: {
      bsonType: "string",
      description: "must be a string",
    },
    baseStats: {
      bsonType: "object",
      description: "must be an object and is required",
    },
    profile: profileSchema,
    spawn: spawnSchema,
    charClass: {
      bsonType: "string",
      description: "must be a string",
    },
    gold: {
      bsonType: "number",
      description: "must be a number",
    },
    npcKills: {
      bsonType: "object",
      description: "must be an object",
    },
    quests: {
      bsonType: "array",
      description: "must be an array",
    },
    updatedAt: {
      bsonType: "date",
      description: "must be a date",
    },
    equipment: itemSlotsSchema,
    abilities: itemSlotsSchema,
    inventory: { bsonType: "array", items: savedItemSchema },
    activeItemSlots: {
      bsonType: "array",
      description: "must be an array",
    },
    createdAt: {
      bsonType: "date",
      description: "must be a date",
    },
    userSettings: userSettingsSchema,
  },
};

export { userSchema };
