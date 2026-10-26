import { deleteBagItemAtId, deleteInventoryItemAtId, setBagItem } from "./edit";
import { checkSlotsMatch, withSlot, withoutSlot } from "./slots";
import type { ResolvedMove } from "./move-resolve";
import type { InventoryState, ItemSlotValue } from "./types";

type Endpoint = ResolvedMove["from"];

const CONTAINERS: string[] = ["inventory", "equipment", "abilities", "bag"];
/** Equipment and abilities do not swap with each other. */
const UNSUPPORTED_PAIRS = ["equipment>abilities", "abilities>equipment"];

const isSpellOrStackable = (item: ItemSlotValue) =>
  ["spell", "stackable"].includes(item?.type as string);

/**
 * Whether the item may go where it is headed. Every pair of places has its own checks;
 * pairs that are missing here (equipment <-> abilities) simply do nothing.
 */
function isAllowed(from: Endpoint, to: Endpoint, fromItem: ItemSlotValue, toItem: ItemSlotValue) {
  const pair = `${from.location}>${to.location}`;
  switch (pair) {
    case "inventory>equipment":
      return !(fromItem && !checkSlotsMatch(fromItem.slot, to.slot as string));
    case "inventory>abilities":
      return isSpellOrStackable(fromItem);
    case "inventory>bag":
      return !!to.bagId;
    case "bag>bag":
      return !!from.bagId && !!to.bagId;
    case "bag>inventory":
      return !!from.bagId;
    case "bag>abilities":
      return !!from.bagId && isSpellOrStackable(fromItem);
    case "bag>equipment":
      return !!from.bagId && !(fromItem && !checkSlotsMatch(fromItem.slot, to.slot as string));
    case "equipment>equipment":
      return checkSlotsMatch(fromItem?.slot, to.slot as string);
    case "equipment>inventory":
      return !(toItem && !checkSlotsMatch(toItem.slot, from.slot as string));
    case "equipment>bag":
      return !(toItem && !checkSlotsMatch(toItem.slot, fromItem?.slot)) && !!to.bagId;
    case "abilities>inventory":
      return !(toItem && !checkSlotsMatch(toItem.type, fromItem?.type));
    case "abilities>bag":
      return !(toItem && !checkSlotsMatch(toItem.type, fromItem?.type)) && !!to.bagId;
    default:
      return true;
  }
}

/** Takes the item out of where it was picked up. */
function take(state: InventoryState, from: Endpoint): InventoryState {
  switch (from.location) {
    case "inventory":
      return { ...state, inventory: deleteInventoryItemAtId(state.inventory, from.itemId) };
    case "bag":
      return { ...state, inventory: deleteBagItemAtId(state.inventory, from.itemId) };
    case "equipment":
      return { ...state, equipment: withoutSlot(state.equipment, from.slot) };
    default:
      return { ...state, abilities: withoutSlot(state.abilities, from.slot) };
  }
}

/** Puts an item into a slot. Null when the slot is in a bag that does not exist. */
function put(state: InventoryState, where: Endpoint, item: ItemSlotValue): InventoryState | null {
  switch (where.location) {
    case "inventory":
      return { ...state, inventory: withSlot(state.inventory, where.slot, item) };
    case "equipment":
      return { ...state, equipment: withSlot(state.equipment, where.slot, item) };
    case "abilities":
      return { ...state, abilities: withSlot(state.abilities, where.slot, item) };
    default: {
      const inventory = setBagItem(state.inventory, where.bagId, where.slot, item);
      return inventory && { ...state, inventory };
    }
  }
}

/**
 * Moves or swaps an item between the inventory, equipment, abilities and bags. The item
 * that was at the destination goes back to where the moved item came from.
 * Returns null when the move is refused.
 */
export function transferItem(
  state: InventoryState,
  { from, to, fromItem, toItem }: ResolvedMove,
): InventoryState | null {
  const known =
    CONTAINERS.includes(from.location as string) && CONTAINERS.includes(to.location as string);
  if (!known || UNSUPPORTED_PAIRS.includes(`${from.location}>${to.location}`)) return state;
  if (!isAllowed(from, to, fromItem, toItem)) return null;
  const placed = put(take(state, from), to, fromItem);
  return placed && put(placed, from, toItem);
}
