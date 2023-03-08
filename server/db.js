import { MongoClient } from "mongodb";

const connectToDatabase = async (uri) => {
  let mongoClient;

  try {
    mongoClient = new MongoClient(uri);
    console.log(`💾 Connecting to db on ${uri}`);
    await mongoClient.connect();
    console.log("💾 Connected to db");
    return mongoClient.db("aether");
  } catch (error) {
    console.error("❌ Connection to db failed", error);
    process.exit();
  }
};

export async function initDatabase(uri) {
  const db = await connectToDatabase(uri);
  return {
    getUserByEmail: async (email) => {
      const user = await db.collection("users").findOne({ email });
      console.log(`💾 Found ${user?.email} in db`);
      return user;
    },
    updateUser: async (player) => {
      if (!player?.email) {
        return console.log("❌ Error while saving player. Player not found");
      }
      await db.collection("users").findOneAndUpdate(
        { email: player?.email },
        {
          $set: {
            x: player?.x,
            y: player?.y,
            //quests: user.quests,
            //username: user.username,
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
      console.log(`💾 Saved ${player?.email} to db`);
    },
  };
}
