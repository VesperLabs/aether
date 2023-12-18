import { MongoClient, Db } from "mongodb";
import { userSchema } from "./schema";
import ItemBuilder from "../../shared/ItemBuilder";
import { useGetBaseCharacterDefaults, filterNullEmpty } from "../utils";
import { omitBy, isNil } from "lodash";

const getDatabaseApi = (db) => ({
  getUserByEmail: async ({ email }) => {
    return execute("getUserByEmail", async () => {
      if (!email) return console.log("❌ Email not provided");
      const user = await db.collection("users").findOne({ email });
      return user;
    });
  },
  getAllUsers: async ({ page = 1, pageSize = 10, sortBy = "updatedAt" }) => {
    const skip = (page - 1) * pageSize;
    const users = await db
      .collection("users")
      .find()
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return users;
  },
  countAllUsers: async () => {
    return execute("countAllUsers", async () => {
      const count = await db.collection("users").countDocuments();
      return count;
    });
  },
  pruneNoobs: async () => {
    return execute("pruneNoobs", async () => {
      // Delete documents with baseStats.level equal to 1
      const deleteResult = await db.collection("users").deleteMany({ "baseStats.level": 1 });
      // const updateResult = await db
      //   .collection("users")
      //   .updateMany({}, { $set: { "equipment.gloves": null } });
      // Print the number of documents deleted
    });
  },
  getUserByLogin: async ({ email, password = "" }) => {
    return execute("getUserByLogin", async () => {
      if (!email) return console.log("❌ Email not provided");
      const user = await db
        .collection("users")
        .findOne({ email: `${email}`.toLowerCase(), password });
      return user;
    });
  },
  createUser: async ({ email, charClass, password }) => {
    return execute("createUser", async () => {
      if (!email) {
        return console.log("❌ Error while creating player. Email not provided");
      }
      const player = createBaseUser(charClass);
      const { updatedAt, createdAt } = getAuditFields();
      await db.collection("users").insertOne({
        email: `${email}`.toLowerCase(),
        password,
        charClass: player?.charClass,
        x: player?.x,
        y: player?.y,
        quests: player?.quests,
        profile: player?.profile,
        direction: player?.direction,
        gold: player.gold,
        stats: {
          hp: player?.stats?.hp,
          mp: player?.stats?.mp,
          sp: player?.stats?.sp,
          exp: player?.stats?.exp,
        },
        equipment: filterNullEmpty(player?.equipment),
        inventory: filterNullEmpty(player.inventory),
        baseStats: player?.baseStats,
        roomName: player?.roomName,
        abilities: filterNullEmpty(player?.abilities),
        updatedAt,
        createdAt,
      });
      return true;
    });
  },
  updateUserMapDetails: async (args) => {
    return execute("updateUserMapDetails", async () => {
      const { updatedAt } = getAuditFields();
      if (args?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!args?.email) {
        return console.log("❌ Error while saving player. Player not found");
      }
      await db.collection("users").findOneAndUpdate(
        { email: args?.email },
        {
          $set: omitBy(
            {
              roomName: args?.room?.name ?? args?.roomName,
              x: args?.x,
              y: args?.y,
              spawn: args?.spawn,
              updatedAt,
            },
            isNil
          ),
        }
      );
    });
  },
  updateUserSetting: async (player, { name, value }) => {
    return execute("updateUserSetting", async () => {
      const { updatedAt } = getAuditFields();
      if (player?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!player?.email) {
        return console.log("❌ Error while saving player. Player not found");
      }
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            [`userSettings.${name}`]: value,
            updatedAt,
          },
        }
      );
    });
  },
  updateUser: async (player) => {
    return execute("updateUser", async () => {
      if (player?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!player?.email) {
        return console.log("❌ Error while saving player. Player not found");
      }
      const { updatedAt } = getAuditFields();
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            charClass: player?.charClass,
            quests: player?.quests,
            profile: player?.profile,
            direction: player?.direction,
            gold: player.gold,
            npcKills: player?.npcKills,
            stats: {
              hp: player?.stats?.hp,
              mp: player?.stats?.mp,
              sp: player?.stats?.sp,
              exp: player?.stats?.exp,
            },
            equipment: filterNullEmpty(player?.equipment),
            inventory: filterNullEmpty(player.inventory),
            baseStats: player?.baseStats,
            //roomName: player?.room?.name,
            abilities: filterNullEmpty(player?.abilities),
            activeItemSlots: player?.activeItemSlots,
            updatedAt,
          },
        }
      );
    });
  },
});

async function execute(operationName, operation, onError = () => {}) {
  try {
    const res = await operation();
    //console.log(`🔧 ${operationName} succeeded`);
    return res;
  } catch (error) {
    console.error(`❌ ${operationName} failed`, error);
    onError();
    throw error;
  }
}

function getAuditFields() {
  const currentDate = new Date();
  return {
    createdAt: currentDate,
    updatedAt: currentDate,
  };
}

export async function initDatabase(uri: string) {
  let mongoClient: MongoClient;
  let db: Db;

  await execute(
    "Connect to DB",
    async () => {
      mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      db = mongoClient.db("aether");
    },
    () => {
      process.exit();
    }
  );

  await execute("Create users collection", async () => {
    const usersCollectionExists = await db.listCollections({ name: "users" }).hasNext();
    if (!usersCollectionExists) await db.createCollection("users");
  });

  await execute("Create user indexes", async () => {
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
  });

  await execute("Add user schema", async () => {
    await db.command({
      collMod: "users",
      validator: { $jsonSchema: userSchema },
      validationLevel: "strict",
      validationAction: "error",
    });
  });

  return getDatabaseApi(db);
}

export const createBaseUser = (charClass) => {
  const { baseStats, startingWeapon, roomName, x, y } = useGetBaseCharacterDefaults({
    level: 1,
    charClass,
  });

  return {
    roomName,
    x,
    y,
    charClass,
    baseStats,
    stats: {
      hp: 0,
      mp: 0,
      sp: 0,
      exp: 0,
    },
    gold: 10,
    direction: "down",
    quests: [],
    equipment: {
      handRight: null,
      handLeft: startingWeapon,
      helmet: null,
      accessory: null,
      pants: ItemBuilder.buildItem("pants", "common", "clothPants"),
      armor: ItemBuilder.buildItem("armor", "common", "clothRobe"),
      gloves: null,
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [],
    abilities: {
      1: charClass === "mage" ? ItemBuilder.buildItem("spell", "common", "fireball") : null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    },
    profile: {
      userName: "Noob",
      gender: "female",
      race: "human",
      hair: { tint: "0x88FFFF", texture: "hair-3" },
      face: { texture: "face-1" },
      whiskers: { texture: "whiskers-3", tint: "0x88FFFF" },
    },
    userSettings: {
      playMusic: true,
      showMinimap: true,
    },
  };
};
