import { ITEM_CATALOG } from "./item-catalog";

/** Where an item key lives in `itemList`. Every key is unique across types. */
export interface ItemKeyEntry {
  key: string;
  type: string;
  rarity: string;
  /** The display name, e.g. "Fox Blade" for `foxBlade`. Spells add their level: "Fireball Lv. 2". */
  name: string;
  /** What the item looks like, enough to draw an icon. */
  look: ItemLook;
}

export interface ItemLook {
  slot?: string;
  texture?: string;
  tint?: string;
}

export const ITEM_KEYS: readonly ItemKeyEntry[] = Object.values(ITEM_CATALOG).map(
  ({ key, type, rarity, name, rank, slot, texture, tint }) => ({
    key,
    type,
    rarity,
    name: slot === "spell" && rank ? `${name} Lv. ${rank}` : name,
    look: { slot, texture, tint },
  }),
);

const BY_LOWER_KEY = new Map(ITEM_KEYS.map((entry) => [entry.key.toLowerCase(), entry]));

/** Looks up an item by key, ignoring case. */
export function findItemKey(key: string): ItemKeyEntry | undefined {
  return BY_LOWER_KEY.get(key.toLowerCase());
}
