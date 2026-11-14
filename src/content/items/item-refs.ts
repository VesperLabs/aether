import type { TierKey, UniqueKey } from "./gear-data";
import type { SlotCount } from "./gear-types";
import type { cardItems } from "./card";
import type { SetPieceKey } from "./item-sets";
import type { spellItems } from "./spell";
import type { stackableItems } from "./stackable";

type TableKey<T> = { [R in keyof T]: keyof T[R] }[keyof T];

/** Every item's key. A ref to an item that doesn't exist, or a tier not made yet, won't compile. */
type ItemKey =
  | TierKey
  | UniqueKey
  | SetPieceKey
  | TableKey<typeof stackableItems>
  | TableKey<typeof cardItems>
  | TableKey<typeof spellItems>;

/** An item to build: its key, or a family tier with a set number of blank mod slots. */
export type ItemRef = ItemKey | { readonly key: TierKey; readonly slots: SlotCount };

/** A mob drop: an item ref with a 1-in-`chance` roll. */
export type ItemDrop = { readonly item: ItemRef; readonly chance: number };

/** A ref read from stored or network data, typed loosely: `ItemRef` is one. */
export type AnyItemRef = string | { readonly key: string; readonly slots?: number };

/** A ref as plain parts: its key, and its slot count when it sets one. */
export function readRef(ref: AnyItemRef): { key: string; slots?: number } {
  return typeof ref === "string" ? { key: ref } : ref;
}
