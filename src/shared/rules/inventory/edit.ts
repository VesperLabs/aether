import { findAbilityById, findBagItemById, findInventoryItemById, locateBagItem } from "./lookup";
import { cloneItem, withSlot } from "./slots";
import type { InventoryItem, ItemSlotValue } from "./types";

/*
 * Every function here returns a changed copy and leaves its input alone.
 * Quantities may arrive as numbers or numeric strings, so they are compared loosely like before.
 */

export interface Subtracted<T> {
  /** The container after the subtraction (the same one if nothing was subtracted). */
  result: T;
  /** The amount taken, or null if nothing could be taken. */
  subtracted: number | null;
}

/** Empties the first inventory slot holding this id. */
export function deleteInventoryItemAtId(inventory: ItemSlotValue[], id: string | undefined) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i]?.id === id) return withSlot(inventory, i, null);
  }
  return inventory;
}

/** Replaces the first inventory slot holding this id. */
export function updateInventoryItemAtId(
  inventory: ItemSlotValue[],
  id: string | undefined,
  item: ItemSlotValue,
) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i]?.id === id) return withSlot(inventory, i, item);
  }
  return inventory;
}

/** Takes `amount` from a stack in the inventory, removing the stack when it runs out. */
export function subtractInventoryItemAtId(
  inventory: ItemSlotValue[],
  id: string | undefined,
  amount: number,
): Subtracted<ItemSlotValue[]> {
  const found = cloneItem(findInventoryItemById(inventory, id));
  const have: any = found?.amount;
  if (have >= amount && amount > 0) {
    const newAmount = have - amount;
    const result =
      newAmount < 1
        ? deleteInventoryItemAtId(inventory, id)
        : updateInventoryItemAtId(inventory, id, { ...found, amount: newAmount });
    return { result, subtracted: amount };
  }
  return { result: inventory, subtracted: null };
}

/** Puts an item in the first empty inventory slot, or at the end when none is free. */
export function addInventoryItem(inventory: ItemSlotValue[], item: InventoryItem) {
  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]?.id) return withSlot(inventory, i, item);
  }
  return [...inventory, item];
}

/** Applies `change` to the bag slot holding this id (the same one `findBagItemById` finds). */
function changeBagItem(
  inventory: ItemSlotValue[],
  id: string | undefined,
  change: (bagItems: ItemSlotValue[], index: number) => ItemSlotValue[],
) {
  const { bagIndex, slotIndex } = locateBagItem(inventory, id);
  const bag = inventory[bagIndex];
  if (!bag) return inventory;
  return withSlot(inventory, bagIndex, { ...bag, items: change(bag.items ?? [], slotIndex) });
}

export function updateBagItemAtId(
  inventory: ItemSlotValue[],
  id: string | undefined,
  item: ItemSlotValue,
) {
  return changeBagItem(inventory, id, (items, i) => withSlot(items, i, item));
}

export function deleteBagItemAtId(inventory: ItemSlotValue[], id: string | undefined) {
  return changeBagItem(inventory, id, (items, i) => withSlot(items, i, null));
}

/** Takes `amount` from a stack inside a bag. Unlike the inventory it never removes the stack. */
export function subtractBagItemAtId(
  inventory: ItemSlotValue[],
  id: string | undefined,
  amount: number,
): Subtracted<ItemSlotValue[]> {
  const found = cloneItem(findBagItemById(inventory, id).item);
  const have: any = found?.amount;
  if (have > amount && amount > 0) {
    const newAmount = have - amount;
    return {
      result: updateBagItemAtId(inventory, id, { ...found, amount: newAmount }),
      subtracted: amount,
    };
  }
  return { result: inventory, subtracted: null };
}

/** Sets a slot of a bag. Returns null when there is no such bag. */
export function setBagItem(
  inventory: ItemSlotValue[],
  bagId: string | null | undefined,
  slot: number | string | null | undefined,
  item: ItemSlotValue,
): ItemSlotValue[] | null {
  const index = inventory.findIndex((entry) => entry?.id === bagId);
  const bag = inventory[index];
  if (index === -1 || !bag) return null;
  return withSlot(inventory, index, { ...bag, items: withSlot(bag.items ?? [], slot, item) });
}

/** Takes `amount` from an ability stack. Unlike the inventory it never removes the stack. */
export function subtractAbilityAtId(
  abilities: Record<string, ItemSlotValue>,
  id: string | undefined,
  amount: number,
): Subtracted<Record<string, ItemSlotValue>> {
  const { item: found, slotName } = findAbilityById(abilities, id);
  const have: any = found?.amount;
  if (have > amount && amount > 0) {
    return {
      result: withSlot(abilities, slotName, { ...found, amount: have - amount }),
      subtracted: amount,
    };
  }
  return { result: abilities, subtracted: null };
}

/** Empties the ability slot holding this id. */
export function deleteAbilityAtId(
  abilities: Record<string, ItemSlotValue>,
  id: string | undefined,
) {
  const { slotName } = findAbilityById(abilities, id);
  return withSlot(abilities, slotName, null);
}
