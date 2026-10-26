import {
  findAbilityById,
  findBagItemBySlot,
  findEquipmentById,
  findInventoryItemById,
  findOpenBagSlot,
} from "./lookup";
import { cloneItem } from "./slots";
import type {
  InventoryItem,
  ItemSlotValue,
  InventoryState,
  MoveContext,
  MoveEndpoint,
  MoveRejected,
} from "./types";

/** A move endpoint with the id of the item found there. */
export interface ResolvedEndpoint extends MoveEndpoint {
  itemId?: string;
}

export interface ResolvedMove {
  from: ResolvedEndpoint;
  to: ResolvedEndpoint;
  /** Copies of the items at each end, so the rules can edit them freely. */
  fromItem: ItemSlotValue;
  toItem: ItemSlotValue;
}

const reject = (error?: string): MoveRejected =>
  error ? { moved: false, error } : { moved: false };

/** Finds the item being picked up, whether it is in the player's things or on a shop shelf. */
function resolveFrom(
  state: InventoryState,
  from: ResolvedEndpoint,
  to: MoveEndpoint,
  context: MoveContext,
): ItemSlotValue | MoveRejected {
  switch (from.location) {
    case "inventory":
      from.itemId = state.inventory[from.slot as number]?.id;
      return cloneItem(findInventoryItemById(state.inventory, from.itemId));
    case "equipment":
      from.itemId = state.equipment[from.slot as string]?.id;
      return itemOf(findEquipmentById(state.equipment, from.itemId));
    case "abilities":
      from.itemId = state.abilities[from.slot as string]?.id;
      return itemOf(findAbilityById(state.abilities, from.itemId));
    case "shop": {
      const { npcId, slot: shopSlot } = context.shop ?? {};
      // Only stackable items keep their shelf id; everything else gets a unique id when bought.
      const isStackable = shopSlot?.item?.slot === "stackable";
      if (!npcId) return reject();
      if (!shopSlot?.stock) return reject();
      if (to.location === "shop") return reject();
      from.itemId = shopSlot?.item?.id;
      return cloneItem({
        ...(shopSlot?.item || {}),
        id: isStackable ? from.itemId : context.newId(),
        ...(isStackable ? { amount: from.amount as number } : {}),
      });
    }
    case "bag": {
      const item = cloneItem(findBagItemBySlot(state.inventory, from.bagId, from.slot));
      from.itemId = item?.id;
      return item;
    }
    default:
      return undefined;
  }
}

/** Finds what is at the destination. Dropping on a bag picks the bag's first open slot. */
function resolveTo(
  state: InventoryState,
  from: ResolvedEndpoint,
  to: ResolvedEndpoint,
  fromItem: ItemSlotValue,
): ItemSlotValue | MoveRejected {
  switch (to.location) {
    case "inventory":
      to.itemId = state.inventory[to.slot as number]?.id;
      return cloneItem(findInventoryItemById(state.inventory, to.itemId));
    case "equipment":
      to.itemId = state.equipment[to.slot as string]?.id;
      return itemOf(findEquipmentById(state.equipment, to.itemId));
    case "abilities":
      to.itemId = state.abilities[to.slot as string]?.id;
      return itemOf(findAbilityById(state.abilities, to.itemId));
    case "bag": {
      // A slot of 0 counts as "dropped on the bag itself", like any falsy slot.
      if (!to.slot) {
        to.slot = findOpenBagSlot(state.inventory, to.bagId, fromItem);
      }
      const item = cloneItem(findBagItemBySlot(state.inventory, to.bagId, to.slot));
      if (to.slot === null || to.slot === undefined) return reject("Bag is full.");
      to.itemId = item?.id;
      return item;
    }
    default:
      return undefined;
  }
}

/**
 * Looks up both ends of a move and runs the checks every move shares: the shelf must have the
 * item, bags do not go in bags, and putting a non-stackable item on itself does nothing.
 */
export function resolveMove(
  state: InventoryState,
  fromEndpoint: MoveEndpoint,
  toEndpoint: MoveEndpoint,
  context: MoveContext,
): ResolvedMove | MoveRejected {
  const from: ResolvedEndpoint = { ...fromEndpoint };
  const to: ResolvedEndpoint = { ...toEndpoint };

  const fromItem = resolveFrom(state, from, to, context);
  if (isRejected(fromItem)) return fromItem;
  const toItem = resolveTo(state, from, to, fromItem);
  if (isRejected(toItem)) return toItem;

  if (fromItem?.base === "bag" && to.bagId) return reject("Cannot put bags in bags.");

  // Same non-stackable item, nothing to do.
  if (from.itemId === to.itemId) {
    if (fromItem?.slot !== "stackable" && toItem?.slot !== "stackable") return reject();
  }
  return { from, to, fromItem, toItem };
}

function isRejected(value: ItemSlotValue | MoveRejected): value is MoveRejected {
  return !!value && (value as MoveRejected).moved === false;
}

/** The item of a lookup result, copied. A missing slot stays missing (undefined), not null. */
function itemOf(found: { item: ItemSlotValue }): ItemSlotValue {
  return cloneItem(found as InventoryItem)?.item;
}
