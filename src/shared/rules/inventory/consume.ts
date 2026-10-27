import { CONSUMABLES_BASES, POTION_BASES } from "./constants";
import {
  deleteAbilityAtId,
  deleteBagItemAtId,
  subtractAbilityAtId,
  subtractBagItemAtId,
  subtractInventoryItemAtId,
} from "./edit";
import { findAbilityById, findBagItemById, findInventoryItemById } from "./lookup";
import type { InventoryItem, InventoryState } from "./types";

export interface ConsumeRequest {
  location?: string | null;
  item?: { id?: string | null } | null;
}

export type ConsumeResult =
  | {
      consumed: true;
      /** The inventory after one item is used up. */
      state: InventoryState;
      /** The item that was used. */
      item: InventoryItem;
      /** Whether it is a potion: potions start the potion cooldown and restore hp and mp. */
      isPotion: boolean;
      hp?: number;
      mp?: number;
      /** Food gives these buffs (name -> level). */
      isFood: boolean;
      buffs: Record<string, any>;
    }
  | { consumed: false };

const refused: ConsumeResult = { consumed: false };

/**
 * Uses up one potion or food from the inventory, abilities or a bag. Never changes `state`;
 * returns the new state and what the item does, for the caller to apply to the character.
 */
export function consumeItem(
  state: InventoryState,
  { location, item }: ConsumeRequest,
): ConsumeResult {
  if (!["inventory", "abilities", "bag"].includes(location as string)) return refused;
  const id = item?.id as string | undefined;
  let next = state;
  let used: InventoryItem | null | undefined;

  if (location === "inventory") {
    used = findInventoryItemById(state.inventory, id);
    if (!CONSUMABLES_BASES.includes(used?.base as string)) return refused;
    if (!used?.amount) return refused;
    next = { ...next, inventory: subtractInventoryItemAtId(state.inventory, id, 1).result };
  }

  if (location === "abilities") {
    used = findAbilityById(state.abilities, id).item;
    if (!CONSUMABLES_BASES.includes(used?.base as string)) return refused;
    if (!used?.amount) return refused;
    const abilities =
      (used.amount as number) <= 1
        ? deleteAbilityAtId(state.abilities, id)
        : subtractAbilityAtId(state.abilities, id, 1).result;
    next = { ...next, abilities };
  }

  if (location === "bag") {
    used = findBagItemById(state.inventory, id).item;
    if (!CONSUMABLES_BASES.includes(used?.base as string)) return refused;
    if (!used?.amount) return refused;
    const inventory =
      (used.amount as number) <= 1
        ? deleteBagItemAtId(state.inventory, id)
        : subtractBagItemAtId(state.inventory, id, 1).result;
    next = { ...next, inventory };
  }

  if (!used) return refused;
  return {
    consumed: true,
    state: next,
    item: used,
    isPotion: POTION_BASES.includes(used.base as string),
    hp: used.effects?.hp,
    mp: used.effects?.mp,
    isFood: used.base === "food",
    buffs: used.buffs ?? {},
  };
}
