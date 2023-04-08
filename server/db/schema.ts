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
  },
};

const userSchema = {
  bsonType: "object",
  required: ["x", "y", "roomName", "baseStats"],
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
    charClass: {
      bsonType: "string",
      description: "must be a string",
    },
    gold: {
      bsonType: "number",
      description: "must be a number",
    },
  },
};

export { userSchema };
