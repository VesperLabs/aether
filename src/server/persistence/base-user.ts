import { ItemBuilder, type CharClass, type Dice } from "@/content";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { getBaseCharacterDefaults } from "../auth/character-defaults";

export const createBaseUser = (
  dice: Dice,
  charClass?: string | null,
  gender: "male" | "female" = "female",
) => {
  const { baseStats, startingWeapon, startingSpell, roomName, x, y } = getBaseCharacterDefaults({
    dice,
    level: 1,
    /* Comes straight from the client; unknown classes get no starting gear. */
    charClass: charClass as CharClass | undefined,
  });

  return {
    roomName,
    x,
    y,
    charClass: charClass as CharClass | undefined,
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
      pants: ItemBuilder.buildItem(dice, "pants", "common", "clothPants"),
      armor: ItemBuilder.buildItem(dice, "armor", "common", "clothRobe"),
      gloves: null,
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [],
    abilities: {
      1: startingSpell,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    },
    profile: {
      userName: "Noob",
      gender,
      race: "human",
      hair: { tint: "0x88FFFF", texture: "hair-3" },
      face: { texture: "face-1" },
      whiskers: { texture: "whiskers-3", tint: "0x88FFFF" },
    },
    userSettings: DEFAULT_USER_SETTINGS,
  };
};
