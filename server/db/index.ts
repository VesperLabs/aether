import { MongoClient } from "mongodb";
import { userSchema } from "./schema";
import ItemBuilder from "../ItemBuilder";

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
            charClass: player?.charClass,
            x: player?.x,
            y: player?.y,
            //quests: user.quests,
            profile: player?.profile,
            direction: player?.direction,
            gold: player.gold,
            //state: player.state,
            //spells: player.spells,
            stats: {
              hp: player?.stats?.hp,
              mp: player?.stats?.mp,
              exp: player?.stats?.exp,
            },
            equipment: player?.equipment,
            inventory: player.inventory,
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

export const baseUser = {
  email: "arf@arf.arf",
  charClass: "warrior",
  baseStats: {
    expValue: 0,
    level: 1,
    speed: 150,
    accuracy: 0,
    attackDelay: 100,
    spellDamage: 0,
    castSpeed: 1000,
    armorPierce: 0,
    dexterity: 20,
    strength: 1,
    vitality: 1,
    intelligence: 1,
    defense: 0,
    blockChance: 0,
    critChance: 0,
    critMultiplier: 2,
    dodgeChance: 0,
    maxDamage: 0,
    minDamage: 0,
    magicFind: 1,
    regenHp: 1,
    regenMp: 1,
    maxExp: 20,
    maxHp: 10,
    maxMp: 10,
  },
  stats: {
    hp: 0,
    mp: 0,
    exp: 0,
  },
  gold: 100,
  direction: "down",
  equipment: {
    handRight: ItemBuilder.buildItem("weapon", "set", "hawkwingsPincher"),
    handLeft: ItemBuilder.buildItem("weapon", "set", "hawkwingsTickler"),
    helmet: ItemBuilder.buildItem("helmet", "unique", "theBunnyWhisker"),
    accessory: ItemBuilder.buildItem("accessory", "unique", "compoundLenses"),
    pants: ItemBuilder.buildItem("pants", "set", "chetsChampions"),
    armor: ItemBuilder.buildItem("armor", "set", "chetsPurpleShirt"),
    boots: ItemBuilder.buildItem("boots", "set", "chetsNeonKicks"),
    ring1: ItemBuilder.buildItem("ring", "unique", "bloodMusic"),
    ring2: ItemBuilder.buildItem("ring", "set", "timmysSignet"),
    amulet: ItemBuilder.buildItem("amulet", "set", "timmysChain"),
  },
  inventory: [
    ItemBuilder.buildItem("armor", "rare", "nutshellPlate"),
    ItemBuilder.buildItem("weapon", "unique", "darkWhistler"),
    ItemBuilder.buildItem("weapon", "rare", "katar"),
    ItemBuilder.buildItem("weapon", "rare", "katar"),
    ItemBuilder.buildItem("shield", "magic", "buckler"),
    ItemBuilder.buildItem("weapon", "magic", "spear"),
    ItemBuilder.buildItem("weapon", "unique", "darkWhistler"),
    ItemBuilder.buildItem("armor", "unique", "theMossmanProphecy"),
    ItemBuilder.buildItem("armor", "rare", "wizardRobe"),
    ItemBuilder.buildItem("weapon", "unique", "soulEdge"),
    ItemBuilder.buildItem("weapon", "unique", "soulEdge"),
    ItemBuilder.buildItem("shield", "unique", "roundStage"),
    ItemBuilder.buildItem("stackable", "common", "redApple", 10),
  ],
  profile: {
    userName: "Player1",
    gender: "female",
    race: "human",
    hair: { tint: "0x88FFFF", texture: "hair-3" },
    face: { texture: "face-1" },
  },
  roomName: "grassland",
  x: 432,
  y: 400,
};
