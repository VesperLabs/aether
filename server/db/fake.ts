import ItemBuilder from "../ItemBuilder";
import { useGetBaseCharacterDefaults } from "../utils";

export async function initFakeDatabase() {
  return getDatabaseApi();
}

const getDatabaseApi = () => ({
  getUserByEmail: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("warrior") };
  },
  getUserByLogin: async ({ email, password = "" }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("warrior") };
  },
  createUser: async ({ email, charClass, password }) => {
    if (!email) {
      return console.log("❌ Error while creating player. Email not provided");
    }
    console.log(`💾 Created ${email} to db`);
    return true;
  },
  updateUser: async (player) => {
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
});

export const createBaseUser = (charClass: string) => {
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
      hp: 25,
      mp: 25,
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
      handRight: ItemBuilder.buildItem("weapon", "unique", "twigmansBranch"),
      handLeft: startingWeapon,
      helmet: null,
      accessory: null,
      pants: null,
      armor: ItemBuilder.buildItem("armor", "unique", "theMossmanProphecy"),
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [
      // ItemBuilder.buildItem("amulet", "set", "timmysChain"),
      // ItemBuilder.buildItem("ring", "set", "timmysSignet"),
      // ItemBuilder.buildItem("helmet", "unique", "bunnyEars"),
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
      ItemBuilder.buildItem("weapon", "set", "hawkwingsPincher"),
      ItemBuilder.buildItem("weapon", "set", "hawkwingsTickler"),
      ItemBuilder.buildItem("helmet", "set", "hawkwingsHood"),
      ItemBuilder.buildItem("helmet", "unique", "theDragonWhisker"),
      ItemBuilder.buildItem("helmet", "common", "leatherHood"),
      ItemBuilder.buildItem("helmet", "common", "nutshellArmet"),
      ItemBuilder.buildItem("bag", "common", "largePouch"),
      ItemBuilder.buildItem("stackable", "common", "redApple", 10),
    ],
    abilities: {
      1: ItemBuilder.buildItem("spell", "common", "fireball"),
      2: ItemBuilder.buildItem("spell", "common", "evasion"),
      3: ItemBuilder.buildItem("spell", "common", "haste"),
      4: ItemBuilder.buildItem("spell", "common", "endurance"),
    },
    profile: {
      userName: "Player1",
      gender: "female",
      race: "human",
      hair: { tint: "0x88FFFF", texture: "hair-3" },
      face: { texture: "face-1" },
    },
  };
};
