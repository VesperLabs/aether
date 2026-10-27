import { weaponCommon } from "./weapon-common";
import { weaponSpecial } from "./weapon-special";
import { rangedItems } from "./ranged";
import { helmetItems } from "./helmet";
import { armorItems } from "./armor";
import { glovesItems } from "./gloves";
import { bootsItems } from "./boots";
import { pantsItems } from "./pants";
import { shieldItems } from "./shield";
import { accessoryItems } from "./accessory";
import { ringItems } from "./ring";
import { amuletItems } from "./amulet";
import { stackableItems } from "./stackable";
import { spellItems } from "./spell";
import { bagItems } from "./bag";

/** Every item definition, grouped as `itemData[type][rarity][key]`. */
export const itemData = {
  weapon: { common: weaponCommon, ...weaponSpecial },
  helmet: helmetItems,
  armor: armorItems,
  gloves: glovesItems,
  boots: bootsItems,
  pants: pantsItems,
  ranged: rangedItems,
  shield: shieldItems,
  accessory: accessoryItems,
  ring: ringItems,
  amulet: amuletItems,
  stackable: stackableItems,
  spell: spellItems,
  bag: bagItems,
} as const;
