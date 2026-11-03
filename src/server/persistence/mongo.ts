import type { Logger } from "@/server/log/logger";
import type { Dice } from "@/content/items/dice";
import { createServerDice } from "@/server/world/server-dice";
import { MongoClient, type Db } from "mongodb";
import { userSchema } from "./schema";
import { filterNullEmpty } from "./filter-empty";
import { calculateNextMaxExp } from "@/rules/stats";
import { createBaseUser } from "./base-user";
import { pruneItemFromUser, type StoredItemLists } from "./prune-item";
import type { Database, UserDocument } from "./database";

const getDatabaseApi = (
  db: Db,
  dice: Dice,
  log: Logger,
  closeClient: () => Promise<void>,
): Database => ({
  close: closeClient,
  getUserByEmail: async ({ email }) => {
    return execute(log, "getUserByEmail", async () => {
      if (!email) return log.warn("❌ Email not provided");
      const user = await db.collection("users").findOne({ email });
      return user as UserDocument | null;
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

    return users as unknown as UserDocument[];
  },
  countAllUsers: async () => {
    return execute(log, "countAllUsers", async () => {
      const count = await db.collection("users").countDocuments();
      return count;
    });
  },
  updateUsersMaxExp: async () => {
    return execute(log, "updateUsersMaxExp", async () => {
      const users = db.collection("users");

      // Find users and iterate through each user
      const cursor = users.find();
      while (await cursor.hasNext()) {
        const user = await cursor.next();
        if (!user) continue;
        const level = user.baseStats.level;
        const newMaxExp = calculateNextMaxExp(level);

        // Update user's maxExp
        await users.updateOne(
          { _id: user._id },
          { $set: { "baseStats.maxExp": newMaxExp, "stats.exp": 0 } },
        );
      }
    });
  },
  pruneNoobs: async () => {
    return execute(log, "pruneNoobs", async () => {
      // Delete documents with baseStats.level equal to 1
      await db.collection("users").deleteMany({ "baseStats.level": 1 });
      //const deleteResult = await db.collection("users").deleteMany({ email: /@arf.arf/ });
      // const updateResult = await db
      //   .collection("users")
      //   .updateMany({}, { $set: { "equipment.gloves": null } });
      // Print the number of documents deleted
    });
  },
  pruneItemByKey: async (keyToRemove: string) => {
    return execute(log, "pruneItemByKey", async () => {
      const users = db.collection<StoredItemLists>("users");
      for await (const doc of users.find({})) {
        if (pruneItemFromUser(doc, keyToRemove)) {
          await users.updateOne({ _id: doc._id }, { $set: doc });
        }
      }
    });
  },
  getUserByLogin: async ({ email, password = "" }) => {
    return execute(log, "getUserByLogin", async () => {
      if (!email) return log.warn("❌ Email not provided");
      const user = await db
        .collection("users")
        .findOne({ email: `${email}`.toLowerCase(), password });
      return user as UserDocument | null;
    });
  },
  createUser: async ({ email, charClass, password, userName, isBot }) => {
    return execute(log, "createUser", async () => {
      if (!email) {
        return log.warn("❌ Error while creating player. Email not provided");
      }
      const player = createBaseUser(dice, charClass);
      const { updatedAt, createdAt } = getAuditFields();
      await db.collection("users").insertOne({
        email: `${email}`.toLowerCase(),
        password,
        charClass: player?.charClass,
        x: player?.x,
        y: player?.y,
        quests: player?.quests,
        profile: userName ? { ...player?.profile, userName } : player?.profile,
        ...(isBot ? { isBot: true } : {}),
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
        userSettings: player?.userSettings,
      });
      return true;
    });
  },
  updateUserMapDetails: async (args) => {
    return execute(log, "updateUserMapDetails", async () => {
      const { updatedAt } = getAuditFields();
      if (args?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!args?.email) {
        return log.warn("❌ Error while saving player. Player not found");
      }
      await db.collection("users").findOneAndUpdate(
        { email: args?.email },
        {
          $set: Object.fromEntries(
            Object.entries({
              roomName: args?.room?.name ?? args?.roomName,
              x: args?.x,
              y: args?.y,
              spawn: args?.spawn,
              updatedAt,
            }).filter(([, value]) => value != null),
          ),
        },
      );
    });
  },
  updateUserSetting: async (player, { name, value }) => {
    return execute(log, "updateUserSetting", async () => {
      const { updatedAt } = getAuditFields();
      if (player?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!player?.email) {
        return log.warn("❌ Error while saving player. Player not found");
      }
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            [`userSettings.${name}`]: value,
            updatedAt,
          },
        },
      );
    });
  },
  updateUser: async (player) => {
    return execute(log, "updateUser", async () => {
      if (player?.isDemoAccount) {
        return; // console.log("🍔 Demo account. no need to save.");
      }
      if (!player?.email) {
        return log.warn("❌ Error while saving player. Player not found");
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
        },
      );
    });
  },
});

async function execute<T>(
  log: Logger,
  operationName: string,
  operation: () => Promise<T>,
  onError: () => void = () => {},
): Promise<T> {
  try {
    const res = await operation();
    //console.log(`🔧 ${operationName} succeeded`);
    return res;
  } catch (error) {
    log.error(`❌ ${operationName} failed`, error);
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

export async function initDatabase(uri: string, log: Logger, dice: Dice = createServerDice()) {
  let mongoClient: MongoClient;
  let db!: Db;

  await execute(
    log,
    "Connect to DB",
    async () => {
      mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      db = mongoClient.db("aether");
    },
    () => {
      process.exit();
    },
  );

  await execute(log, "Create users collection", async () => {
    const usersCollectionExists = await db.listCollections({ name: "users" }).hasNext();
    if (!usersCollectionExists) await db.createCollection("users");
  });

  await execute(log, "Create user indexes", async () => {
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
  });

  await execute(log, "Add user schema", async () => {
    await db.command({
      collMod: "users",
      validator: { $jsonSchema: userSchema },
      validationLevel: "strict",
      validationAction: "error",
    });
  });

  return getDatabaseApi(db, dice, log, () => mongoClient.close());
}
