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

/**
 * Whether this item may be used now (its cooldown has run out). The caller knows the character's
 * timers; the rule only asks, so a refused item is never used up.
 */
export type IsReadyToConsume = (item: InventoryItem, location: string) => boolean;

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

/** What `takeOneItem` gives back: the inventory with one fewer, and the item it was taken from. */
export type TakeOneResult = { state: InventoryState; item: InventoryItem } | undefined;

/**
 * Takes one of a stack out of the inventory, abilities or a bag, if `accepts` the item and it is
 * ready. Never changes `state`; returns the new state, or undefined when nothing was taken.
 */
export function takeOneItem(
  state: InventoryState,
  { location, item }: ConsumeRequest,
  accepts: (item: InventoryItem) => boolean,
  isReady: IsReadyToConsume = () => true,
): TakeOneResult {
  const id = item?.id as string | undefined;
  const isUsable = (used: InventoryItem | null | undefined): used is InventoryItem =>
    !!used && accepts(used) && !!used.amount && isReady(used, location as string);

  if (location === "inventory") {
    const used = findInventoryItemById(state.inventory, id);
    if (!isUsable(used)) return undefined;
    const inventory = subtractInventoryItemAtId(state.inventory, id, 1).result;
    return { state: { ...state, inventory }, item: used };
  }
  if (location === "abilities") {
    const used = findAbilityById(state.abilities, id).item;
    if (!isUsable(used)) return undefined;
    const abilities =
      (used.amount as number) <= 1
        ? deleteAbilityAtId(state.abilities, id)
        : subtractAbilityAtId(state.abilities, id, 1).result;
    return { state: { ...state, abilities }, item: used };
  }
  if (location === "bag") {
    const used = findBagItemById(state.inventory, id).item;
    if (!isUsable(used)) return undefined;
    const inventory =
      (used.amount as number) <= 1
        ? deleteBagItemAtId(state.inventory, id)
        : subtractBagItemAtId(state.inventory, id, 1).result;
    return { state: { ...state, inventory }, item: used };
  }
  return undefined;
}

/**
 * Uses up one potion or food from the inventory, abilities or a bag. Never changes `state`;
 * returns the new state and what the item does, for the caller to apply to the character.
 */
export function consumeItem(
  state: InventoryState,
  request: ConsumeRequest,
  isReady: IsReadyToConsume = () => true,
): ConsumeResult {
  const taken = takeOneItem(
    state,
    request,
    (item) => CONSUMABLES_BASES.includes(item.base as string),
    isReady,
  );
  if (!taken) return refused;
  const used = taken.item;
  return {
    consumed: true,
    state: taken.state,
    item: used,
    isPotion: POTION_BASES.includes(used.base as string),
    hp: used.effects?.hp,
    mp: used.effects?.mp,
    isFood: used.base === "food",
    buffs: used.buffs ?? {},
  };
}
