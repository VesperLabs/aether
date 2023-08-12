import { MongoClient, Db } from "mongodb";
import { userSchema } from "./schema";
import ItemBuilder from "../../shared/ItemBuilder";
import { useGetBaseCharacterDefaults, filterNullEmpty } from "../utils";

export async function initDatabase(uri) {
  let mongoClient: MongoClient;
  let db: Db;

  try {
    mongoClient = new MongoClient(uri);
    console.log(`💾 Connecting to db on ${uri}`);
    await mongoClient.connect();
    console.log("💾 Connected to db");
    db = mongoClient.db("aether");
  } catch (error) {
    console.error("❌ Connection to db failed", error);
    process.exit();
  }

  /* Create collections  */
  const usersCollectionExists = await db.listCollections({ name: "users" }).hasNext();
  if (!usersCollectionExists) await db.createCollection("users");
  /* Create indexes */
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  /* Add schema */
  await db.command({
    collMod: "users",
    validator: { $jsonSchema: userSchema },
    validationLevel: "strict",
    validationAction: "error",
  });

  return getDatabaseApi(db);
}

const getDatabaseApi = (db) => ({
  getUserByEmail: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    const user = await db.collection("users").findOne({ email });
    return user;
  },
  getAllUsers: async ({ sortBy = "baseStats.maxExp" }) => {
    try {
      const users = await db
        .collection("users")
        .find()
        .sort({ [sortBy]: -1 })
        .toArray();
      return users;
    } catch (error) {
      console.error("Error while fetching all users:", error);
      throw error;
    }
  },
  pruneNoobs: async () => {
    try {
      // Delete documents with baseStats.level equal to 1
      const deleteResult = await db.collection("users").deleteMany({ "baseStats.level": 1 });

      // Print the number of documents deleted
      console.log(`${deleteResult.deletedCount} documents deleted.`);
    } catch (error) {
      console.error("Error while pruning the database:", error);
      throw error;
    }
  },
  getUserByLogin: async ({ email, password = "" }) => {
    if (!email) return console.log("❌ Email not provided");
    const user = await db
      .collection("users")
      .findOne({ email: `${email}`.toLowerCase(), password });
    console.log(`💾 Found ${email} in db`);
    return user;
  },
  createUser: async ({ email, charClass, password }) => {
    if (!email) {
      return console.log("❌ Error while creating player. Email not provided");
    }
    const player = createBaseUser(charClass);
    const { updatedAt, createdAt } = getAuditFields();

    try {
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
    } catch (e) {
      console.log(e);
    }
    console.log(`💾 Created ${email} to db`);
    return true;
  },
  updateUserRoom: async (player) => {
    const { updatedAt } = getAuditFields();
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }
    try {
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            roomName: player?.room?.name ?? player?.roomName,
            x: player?.x,
            y: player?.y,
            updatedAt,
          },
        }
      );
    } catch (e) {
      console.log(e);
    }
    console.log(`💾 Saved Room ${player?.email} to db`);
  },
  updateUser: async (player) => {
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }

    const { updatedAt } = getAuditFields();

    try {
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
    } catch (e) {
      console.log(e);
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
});

function getAuditFields() {
  const currentDate = new Date();
  return {
    createdAt: currentDate,
    updatedAt: currentDate,
  };
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
  };
};
