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
  getUserByEmail: async ({ email }) => {
    if (!email) console.log("❌ Email not provided");
    if (!email) return;
    const user = await db.collection("users").findOne({ email });
    return user;
  },
  getUserByLogin: async ({ email, password = "" }) => {
    if (!email) console.log("❌ Email not provided");
    if (!email) return;
    const user = await db.collection("users").findOne({ email, password });
    console.log(`💾 Found ${email} in db`);
    return user;
  },
  createUser: async ({ email, charClass, password }) => {
    if (!email) {
      return console.log("❌ Error while creating player. Email not provided");
    }
    const player = createBaseUser(charClass);
    try {
      await db.collection("users").insertOne({
        email: email,
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
          exp: player?.stats?.exp,
        },
        equipment: player?.equipment,
        inventory: player.inventory,
        baseStats: player?.baseStats,
        roomName: player?.roomName,
        abilities: player?.abilities,
      });
    } catch (e) {
      console.log(JSON.stringify(e?.errInfo?.details));
    }
    console.log(`💾 Created ${email} to db`);
    return true;
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
            quests: player?.quests,
            profile: player?.profile,
            direction: player?.direction,
            gold: player.gold,
            npcKills: player?.npcKills,
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
            abilities: player?.abilities,
          },
        }
      );
    } catch (e) {
      console.log(JSON.stringify(e?.errInfo?.details));
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
});

export const createBaseUser = (charClass) => {
  const isMage = charClass === "mage";
  const isWarrior = charClass === "warrior";
  const isRogue = charClass === "rogue";
  const isCleric = charClass === "cleric";

  const getStartingWeapon = () => {
    if (isMage) return ItemBuilder.buildItem("weapon", "common", "wand");
    if (isWarrior) return ItemBuilder.buildItem("weapon", "common", "axe");
    if (isRogue) return ItemBuilder.buildItem("weapon", "common", "katar");
  };

  return {
    charClass,
    baseStats: {
      expValue: 0,
      level: 1,
      speed: 100,
      accuracy: 0,
      attackDelay: 100,
      minSpellDamage: 0,
      maxSpellDamage: 0,
      castDelay: 1000,
      armorPierce: 0,
      dexterity: isRogue ? 3 : 1,
      strength: isWarrior ? 3 : 1,
      vitality: isCleric ? 3 : 1,
      intelligence: isMage ? 3 : 1,
      defense: 0,
      blockChance: 0,
      critChance: 0,
      critMultiplier: 1.5,
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
    gold: 10,
    direction: "down",
    quests: [],
    equipment: {
      // handRight: ItemBuilder.buildItem("weapon", "set", "hawkwingsPincher"),
      // handLeft: ItemBuilder.buildItem("weapon", "set", "hawkwingsTickler"),
      // helmet: ItemBuilder.buildItem("helmet", "unique", "theBunnyWhisker"),
      // accessory: ItemBuilder.buildItem("accessory", "unique", "compoundLenses"),
      // pants: ItemBuilder.buildItem("pants", "set", "chetsChampions"),
      // armor: ItemBuilder.buildItem("armor", "set", "chetsPurpleShirt"),
      // boots: ItemBuilder.buildItem("boots", "set", "chetsNeonKicks"),
      // ring1: ItemBuilder.buildItem("ring", "unique", "bloodMusic"),
      // ring2: ItemBuilder.buildItem("ring", "set", "timmysSignet"),
      // amulet: ItemBuilder.buildItem("amulet", "set", "timmysChain"),
      handRight: null,
      handLeft: getStartingWeapon(),
      helmet: null,
      accessory: null,
      pants: null,
      armor: ItemBuilder.buildItem("armor", "common", "clothRobe"),
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [
      // ItemBuilder.buildItem("amulet", "set", "timmysChain"),
      // ItemBuilder.buildItem("ring", "set", "timmysSignet"),
      // ItemBuilder.buildItem("helmet", "unique", "theBunnyWhisker"),
      // ItemBuilder.buildItem("spell", "common", "fireball"),
      // ItemBuilder.buildItem("armor", "rare", "nutshellPlate"),
      // ItemBuilder.buildItem("weapon", "unique", "darkWhistler"),
      // ItemBuilder.buildItem("weapon", "rare", "katar"),
      // ItemBuilder.buildItem("weapon", "rare", "katar"),
      // ItemBuilder.buildItem("shield", "magic", "buckler"),
      // ItemBuilder.buildItem("weapon", "magic", "spear"),
      // ItemBuilder.buildItem("weapon", "unique", "darkWhistler"),
      // ItemBuilder.buildItem("armor", "unique", "theMossmanProphecy"),
      // ItemBuilder.buildItem("armor", "rare", "wizardRobe"),
      // ItemBuilder.buildItem("weapon", "unique", "soulEdge"),
      // ItemBuilder.buildItem("weapon", "unique", "soulEdge"),
      // ItemBuilder.buildItem("shield", "unique", "roundStage"),
      // ItemBuilder.buildItem("stackable", "common", "redApple", 10),
    ],
    abilities: {
      1: isMage ? ItemBuilder.buildItem("spell", "common", "fireball") : null,
      2: null,
      3: null,
      4: null,
    },
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
};
