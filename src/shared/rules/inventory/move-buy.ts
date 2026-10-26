import { SHOP_INFLATION } from "./constants";
import { updateInventoryItemAtId, setBagItem } from "./edit";
import { findAbilityById, findBagItemById, findInventoryItemById, locateBagItem } from "./lookup";
import type { ResolvedMove } from "./move-resolve";
import { checkSlotsMatch, toQuantity, withSlot } from "./slots";
import type { InventoryItem, InventoryState, MoveRejected } from "./types";

const reject = (error?: string): MoveRejected =>
  error ? { moved: false, error } : { moved: false };

/** Adds `bought` to the stack the player already owns, wherever it is. Null if there is none. */
function addToExistingStack(state: InventoryState, item: InventoryItem): InventoryState | null {
  const inBag = findBagItemById(state.inventory, item.id).item;
  const ability = findAbilityById(state.abilities, item.id);
  const inInventory = findInventoryItemById(state.inventory, item.id);
  const existing = inBag || ability.item || inInventory;
  if (!existing) return null;
  const amount = parseInt(String(existing.amount || 0)) + parseInt(String(item.amount || 0));
  const updated = { ...existing, amount };
  if (inBag) {
    const { bagIndex, slotIndex } = locateBagItem(state.inventory, item.id);
    const bag = state.inventory[bagIndex]!;
    const bagWithStack = { ...bag, items: withSlot(bag.items ?? [], slotIndex, updated) };
    return { ...state, inventory: withSlot(state.inventory, bagIndex, bagWithStack) };
  }
  if (ability.item) {
    return { ...state, abilities: withSlot(state.abilities, ability.slotName, updated) };
  }
  return { ...state, inventory: updateInventoryItemAtId(state.inventory, item.id, updated) };
}

/**
 * Buys the shelf item picked up at `from` into the slot at `to`.
 * The shelf price includes inflation, which is removed from the item the player gets.
 */
export function buyItem(
  state: InventoryState,
  { to, fromItem, toItem }: Pick<ResolvedMove, "to" | "fromItem" | "toItem">,
): InventoryState | MoveRejected {
  if (!fromItem) return reject();
  const buyQty = toQuantity(fromItem.amount);
  const buyCost = toQuantity(fromItem.cost) * buyQty;

  // Always needs a free slot, or a slot holding the same stack.
  // TODO: Fix it so we can buy a stackable no matter what if it exists.
  const stackableToStackable = fromItem.id === toItem?.id;
  const itemToBlank = !toItem?.id;
  if (!stackableToStackable && !itemToBlank) return reject();

  if (state.gold < buyCost) return reject("You cannot afford this item");

  const hasStack = !!(
    findBagItemById(state.inventory, fromItem.id).item ||
    findAbilityById(state.abilities, fromItem.id).item ||
    findInventoryItemById(state.inventory, fromItem.id)
  );
  if (hasStack) {
    // Only real stackables merge; anything else that matches is simply not bought.
    if (fromItem.type !== "stackable") return state;
    const merged = addToExistingStack(state, fromItem);
    return merged ? { ...merged, gold: merged.gold - (buyCost || 1) } : state;
  }

  const bought = { ...fromItem, cost: Math.floor(fromItem.cost! / SHOP_INFLATION) };
  const paid = { ...state, gold: state.gold - (buyCost || 1) };
  switch (to.location) {
    case "inventory":
      return { ...paid, inventory: withSlot(state.inventory, to.slot, bought) };
    case "equipment":
      if (!checkSlotsMatch(bought.slot, to.slot as string)) return reject();
      return { ...paid, equipment: withSlot(state.equipment, to.slot, bought) };
    case "abilities":
      if (!["spell", "stackable"].includes(bought.type as string)) return reject();
      return { ...paid, abilities: withSlot(state.abilities, to.slot, bought) };
    case "bag": {
      if (!to.bagId) return reject();
      const inventory = setBagItem(state.inventory, to.bagId, to.slot, bought);
      return inventory ? { ...paid, inventory } : reject();
    }
    default:
      return state;
  }
}
