import type { itemData } from "./item-data";
import type { ItemRarity } from "./item-types";

type ItemTable = typeof itemData;

/** "weapon", "helmet", "spell"... : every top-level group in the item data. */
export type ItemType = keyof ItemTable;

type CommonKeys<T extends ItemType> = "common" extends keyof ItemTable[T]
  ? keyof ItemTable[T]["common" & keyof ItemTable[T]]
  : never;

/**
 * Keys that exist for a type and rarity. Magic and rare items fall back to the common item
 * with the same key when there is no hand-written magic or rare version.
 */
export type ItemKeyFor<T extends ItemType, R extends ItemRarity> =
  | (R extends keyof ItemTable[T] ? keyof ItemTable[T][R] : never)
  | (R extends "magic" | "rare" ? CommonKeys<T> : never);

/** `[type, rarity, key]`. Only combinations that exist in the item data compile. */
export type ItemRef = {
  [T in ItemType]: { [R in ItemRarity]: readonly [T, R, ItemKeyFor<T, R>] }[ItemRarity];
}[ItemType];

/** A mob drop: an item reference with a 1-in-`chance` roll. */
export type ItemDrop = {
  [T in ItemType]: {
    [R in ItemRarity]: {
      readonly type: T;
      readonly rarity: R;
      readonly key: ItemKeyFor<T, R>;
      readonly chance: number;
    };
  }[ItemRarity];
}[ItemType];
