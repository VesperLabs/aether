import {
  deleteAbilityAtId,
  deleteBagItemAtId,
  deleteInventoryItemAtId,
  subtractAbilityAtId,
  subtractBagItemAtId,
  subtractInventoryItemAtId,
} from "./edit";
import {
  findAbilityById,
  findBagItemById,
  findEquipmentById,
  findInventoryItemById,
} from "./lookup";
import { cloneItem, toQuantity, withoutSlot } from "./slots";
import type { InventoryItem, InventoryState } from "./types";

export interface DropRequest {
  location?: string | null;
  /** The item the player says they are dropping. Only its id (and bag contents) are used. */
  item?: { id?: string | null; base?: string | null; items?: unknown[] | null } | null;
  amount?: number | string | null;
}

export type DropResult =
  | { dropped: true; state: InventoryState; item: InventoryItem }
  | { dropped: false; error?: string };

const refused = (error?: string): DropResult =>
  error ? { dropped: false, error } : { dropped: false };

/**
 * Takes an item, or part of a stack, out of the player's things so it can be put on the ground.
 * Never changes `state`; returns the new state and the item to spawn.
 */
export function dropItem(state: InventoryState, request: DropRequest): DropResult {
  const { location, item } = request;
  /* Prevent dropping full bags */
  if (item?.base === "bag" && (item?.items?.filter((i) => i)?.length ?? 0) > 0) {
    return refused("Cannot drop a bag with items inside of it.");
  }
  const amount = toQuantity(request.amount);
  const id = item?.id as string | undefined;
  let next = state;
  let found: InventoryItem | null | undefined = null;
  let dropAmount: number | null | undefined;

  if (location === "equipment") {
    const { item: f, slotName } = findEquipmentById(state.equipment, id);
    found = f;
    next = { ...next, equipment: withoutSlot(state.equipment, slotName) };
  }

  if (location === "abilities") {
    found = findAbilityById(state.abilities, id).item;
    const have: any = found?.amount;
    if (amount >= have) {
      dropAmount = have;
      next = { ...next, abilities: deleteAbilityAtId(state.abilities, id) };
    } else {
      const taken = subtractAbilityAtId(state.abilities, id, amount);
      dropAmount = taken.subtracted;
      next = { ...next, abilities: taken.result };
      if (!dropAmount) return refused();
    }
  }

  if (location === "inventory") {
    found = findInventoryItemById(state.inventory, id);
    const have: any = found?.amount;
    if (amount >= have) {
      dropAmount = have;
      next = { ...next, inventory: deleteInventoryItemAtId(state.inventory, id) };
    } else {
      const taken = subtractInventoryItemAtId(state.inventory, id, amount);
      dropAmount = taken.subtracted;
      next = { ...next, inventory: taken.result };
      if (!dropAmount) return refused();
    }
  }

  if (location === "bag") {
    found = cloneItem(findBagItemById(state.inventory, id).item);
    const have: any = found?.amount;
    if (amount >= have) {
      dropAmount = have;
      next = { ...next, inventory: deleteBagItemAtId(state.inventory, id) };
    } else {
      const taken = subtractBagItemAtId(state.inventory, id, amount);
      dropAmount = taken.subtracted;
      next = { ...next, inventory: taken.result };
      if (!dropAmount) return refused();
    }
  }

  if (!found) return refused();
  return {
    dropped: true,
    state: next,
    item: { ...found, ...(dropAmount ? { amount: dropAmount } : {}) },
  };
}
