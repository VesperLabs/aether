import { armorSprites } from "./armor-sprites";
import { humanoidSprites } from "./humanoid-sprites";
import { itemSprites } from "./item-sprites";
import { mobSprites } from "./mob-sprites";
import { spellSprites } from "./spell-sprites";
import { weaponSprites } from "./weapon-sprites";

/** Order matters: lookups return the first match, and the first entry is the fallback. */
export const assetList = [
  ...humanoidSprites,
  ...mobSprites,
  ...armorSprites,
  ...weaponSprites,
  ...itemSprites,
  ...spellSprites,
] as const;
