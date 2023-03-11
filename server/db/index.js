import { MongoClient } from "mongodb";
import { userSchema } from "./schema";

export async function initDatabase(uri) {
  let mongoClient;
  let db;

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
  getUserByEmail: async (email) => {
    if (!email) return console.log("❌ Email not provided");
    const user = await db.collection("users").findOne({ email });
    console.log(`💾 Found ${user?.email} in db`);
    return user;
  },
  updateUser: async (player) => {
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }
    try {
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            x: player?.x,
            y: player?.y,
            //quests: user.quests,
            profile: player?.profile,
            direction: player?.direction,
            //gold: player.gold,
            //state: player.state,
            //spells: player.spells,
            stats: {
              hp: player?.stats?.hp,
              mp: player?.stats?.mp,
              exp: player?.stats?.exp,
            },
            equipment: player?.equipment,
            //inventory: player.inventory,
            baseStats: player?.baseStats,
            roomName: player?.room?.name,
          },
        }
      );
    } catch (e) {
      console.log(JSON.stringify(e?.errInfo?.details));
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
});
