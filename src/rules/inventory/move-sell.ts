import {
  deleteAbilityAtId,
  deleteBagItemAtId,
  deleteInventoryItemAtId,
  subtractAbilityAtId,
  subtractBagItemAtId,
  subtractInventoryItemAtId,
} from "./edit";
import type { ResolvedMove } from "./move-resolve";
import { toQuantity, withoutSlot } from "./slots";
import type { InventoryState } from "./types";

/** The amount asked for: 1 when missing, otherwise it must be a positive whole number. */
function requestedAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 1;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Sells the item picked up at `from` to a shop and pays the gold.
 * Returns null when the move is refused: the amount must be a positive whole number no larger
 * than what the player has in that slot. Gold is paid only for what was removed.
 */
export function sellItem(
  state: InventoryState,
  { from, fromItem }: Pick<ResolvedMove, "from" | "fromItem">,
): InventoryState | null {
  const sellQty = requestedAmount(from.amount);
  if (sellQty === null || !fromItem) return null;
  const have = toQuantity(fromItem.amount);
  if (sellQty > have) return null;
  const cost = toQuantity(fromItem.cost);
  const paid = (next: InventoryState): InventoryState => ({
    ...next,
    gold: next.gold + sellQty * cost,
  });
  const whole = sellQty === have;

  switch (from.location) {
    case "inventory": {
      const inventory = whole
        ? deleteInventoryItemAtId(state.inventory, from.itemId)
        : subtractInventoryItemAtId(state.inventory, from.itemId, sellQty).result;
      return paid({ ...state, inventory });
    }
    case "bag": {
      if (!from.bagId) return null;
      const inventory = whole
        ? deleteBagItemAtId(state.inventory, from.itemId)
        : subtractBagItemAtId(state.inventory, from.itemId, sellQty).result;
      return paid({ ...state, inventory });
    }
    case "equipment":
      if (sellQty !== 1) return null;
      return paid({
        ...state,
        equipment: withoutSlot(state.equipment, from.slot),
      });
    case "abilities": {
      const abilities = whole
        ? deleteAbilityAtId(state.abilities, from.itemId)
        : subtractAbilityAtId(state.abilities, from.itemId, sellQty).result;
      return paid({ ...state, abilities });
    }
    default:
      return state;
  }
}
