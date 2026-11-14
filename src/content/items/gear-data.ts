import { accessoryFamilies, accessoryUniques } from "./accessory";
import { amuletFamilies, amuletUniques } from "./amulet";
import { armorFamilies, armorUniques } from "./armor";
import { bagFamilies, bagUniques } from "./bag";
import { bootsFamilies, bootsUniques } from "./boots";
import type { Families, TierKeyOf } from "./gear-types";
import { glovesFamilies, glovesUniques } from "./gloves";
import { helmetFamilies, helmetUniques } from "./helmet";
import { pantsFamilies, pantsUniques } from "./pants";
import { rangedFamilies, rangedUniques } from "./ranged";
import { ringFamilies, ringUniques } from "./ring";
import { shieldFamilies, shieldUniques } from "./shield";
import { weaponFamilies, weaponUniques } from "./weapon";

/** Every gear family, by its key: the `base` of each item built from it. */
export const gearFamilies = {
  ...weaponFamilies,
  ...rangedFamilies,
  ...shieldFamilies,
  ...helmetFamilies,
  ...armorFamilies,
  ...glovesFamilies,
  ...bootsFamilies,
  ...pantsFamilies,
  ...accessoryFamilies,
  ...ringFamilies,
  ...amuletFamilies,
  ...bagFamilies,
} as const satisfies Families;

export const gearUniques = {
  ...weaponUniques,
  ...rangedUniques,
  ...shieldUniques,
  ...helmetUniques,
  ...armorUniques,
  ...glovesUniques,
  ...bootsUniques,
  ...pantsUniques,
  ...accessoryUniques,
  ...ringUniques,
  ...amuletUniques,
  ...bagUniques,
} as const;

export type FamilyName = keyof typeof gearFamilies;

/** A family tier that has been made: the only gear that drops with blank mod slots. */
export type TierKey = TierKeyOf<typeof gearFamilies>;

export type UniqueKey = keyof typeof gearUniques;
