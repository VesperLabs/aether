import { ItemBuilder, type CharClass, type Dice } from "@/content";
import { ABILITY_SLOTS, EQUIPMENT_SLOTS } from "@/rules/inventory";
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
      ...Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null])),
      handRight: startingWeapon,
      pants: ItemBuilder.buildItem(dice, "clothPants"),
      armor: ItemBuilder.buildItem(dice, "clothRobe"),
    },
    inventory: [],
    abilities: {
      ...Object.fromEntries(ABILITY_SLOTS.map((slot) => [slot, null])),
      1: startingSpell,
    },
    profile: {
      userName: "Noob",
      gender,
      race: "human",
      hair: { tint: "0xC4F0F5", texture: gender === "male" ? "hair-1" : "hair-3" },
      face: { texture: "face-1" },
      whiskers: { texture: "whiskers-3", tint: "0xC4F0F5" },
    },
    userSettings: DEFAULT_USER_SETTINGS,
  };
};
