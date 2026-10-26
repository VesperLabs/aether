import { MAX_INVENTORY_ITEMS } from "./constants";
import type { InventoryItem, ItemSlotValue } from "./types";

export interface FoundSlot {
  item: ItemSlotValue;
  slotName: string | null;
}

export interface FoundBagItem {
  item: ItemSlotValue;
  slotName: number | null;
}

/** The equipped item with this id and the slot it is in. */
export function findEquipmentById(
  equipment: Record<string, ItemSlotValue> | undefined,
  id: string | undefined,
): FoundSlot {
  const [slotName, item] = Object.entries(equipment ?? {}).find(
    ([_, slotItem]) => slotItem?.id === id,
  ) || [null, null];
  return { item, slotName };
}

/** The ability (spell or stackable) with this id and the slot it is in. */
export function findAbilityById(
  abilities: Record<string, ItemSlotValue> | undefined,
  id: string | undefined,
): FoundSlot {
  return findEquipmentById(abilities, id);
}

/** The inventory item with this id (not items inside bags). */
export function findInventoryItemById(
  inventory: ItemSlotValue[] | undefined,
  id: string | undefined,
): ItemSlotValue {
  let returnItem: ItemSlotValue = null;
  for (let i = 0; i < (inventory?.length ?? 0); i++) {
    if (inventory?.[i]?.id === id) {
      returnItem = inventory?.[i];
      break;
    }
  }
  return returnItem;
}

/** The item with this id inside any bag in the inventory, and its slot in that bag. */
export function findBagItemById(
  inventory: ItemSlotValue[] | undefined,
  id: string | undefined,
): FoundBagItem {
  let item: ItemSlotValue = null;
  let slotName: number | null = null;
  const bags = inventory?.filter((entry) => entry?.base === "bag") ?? [];
  for (const bag of bags) {
    for (let i = 0; i < (bag?.items?.length ?? 0); i++) {
      if (bag?.items?.[i]?.id === id) {
        item = bag?.items?.[i];
        slotName = i;
        break;
      }
    }
  }
  return { slotName, item };
}

/** The item at a slot of the bag with this id. */
export function findBagItemBySlot(
  inventory: ItemSlotValue[] | undefined,
  bagId: string | null | undefined,
  slot: number | string | null | undefined,
): ItemSlotValue {
  const bag = inventory?.find((entry) => entry?.id === bagId);
  return bag?.items?.[slot as number];
}

/** Whether the inventory has a bag (or any item) with this id to put things in. */
export function hasBag(inventory: ItemSlotValue[] | undefined, bagId: string | null | undefined) {
  return !!inventory?.find((entry) => entry?.id === bagId);
}

/** The first bag slot that is empty or already holds the same item (for stacking). */
export function findOpenBagSlot(
  inventory: ItemSlotValue[] | undefined,
  bagId: string | null | undefined,
  item: InventoryItem | null | undefined,
): number | undefined {
  const bag = inventory?.find((entry) => entry?.id === bagId);
  const bagItems = bag?.items ?? [null];
  let openSlot: number | undefined;
  for (let i = 0; i < bagItems.length; i++) {
    // Item found (stackable)
    if (bagItems[i]?.id === item?.id) {
      openSlot = i;
      break;
    }
    // New item
    if (!bagItems[i]?.id) {
      openSlot = i;
      break;
    }
  }
  return openSlot;
}

/** Where `findBagItemById` found its item: which inventory slot holds the bag, and the slot in it. */
export function locateBagItem(inventory: ItemSlotValue[] | undefined, id: string | undefined) {
  let bagIndex = -1;
  let slotIndex = -1;
  inventory?.forEach((entry, b) => {
    if (entry?.base !== "bag") return;
    const i = entry.items?.findIndex((x) => x?.id === id) ?? -1;
    if (i !== -1) {
      bagIndex = b;
      slotIndex = i;
    }
  });
  return { bagIndex, slotIndex };
}

export function isInventoryFull(inventory: ItemSlotValue[] | undefined): boolean {
  return !!inventory?.every(Boolean) && inventory.length >= MAX_INVENTORY_ITEMS;
}
