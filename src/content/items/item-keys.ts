import { itemList } from "./item-scaling";

/** Where an item key lives in `itemList`. Every key is unique across types and rarities. */
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

/* Uses the scaled list so level variants (`fireball2`) inherit their base's name and texture */
export const ITEM_KEYS: readonly ItemKeyEntry[] = Object.entries(itemList).flatMap(
  ([type, rarities]) =>
    Object.entries(rarities).flatMap(([rarity, items]) =>
      Object.entries(items).map(([key, item]) => {
        const {
          slot,
          texture,
          tint,
          name = key,
          ilvl,
        } = item as ItemLook & {
          name?: string;
          ilvl?: number;
        };
        const label = slot === "spell" && ilvl ? `${name} Lv. ${ilvl}` : name;
        return { key, type, rarity, name: label, look: { slot, texture, tint } };
      }),
    ),
);

const BY_LOWER_KEY = new Map(ITEM_KEYS.map((entry) => [entry.key.toLowerCase(), entry]));

/** Looks up an item by key, ignoring case. */
export function findItemKey(key: string): ItemKeyEntry | undefined {
  return BY_LOWER_KEY.get(key.toLowerCase());
}
