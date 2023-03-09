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
  required: ["race"],
  properties: {
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
    direction: {
      bsonType: "string",
      description: "must be a string",
    },
    profile: profileSchema,
  },
};

export { userSchema };
