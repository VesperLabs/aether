import {
  deleteAbilityAtId,
  deleteBagItemAtId,
  subtractAbilityAtId,
  subtractInventoryItemAtId,
} from "./edit";
import type { ResolvedMove } from "./move-resolve";
import { toQuantity, withoutSlot } from "./slots";
import type { InventoryState } from "./types";

/**
 * Sells the item picked up at `from` to a shop and pays the gold.
 * Returns null when the move is refused.
 */
export function sellItem(
  state: InventoryState,
  { from, fromItem }: Pick<ResolvedMove, "from" | "fromItem">,
): InventoryState | null {
  const sellQty = toQuantity(from.amount);
  const cost = toQuantity(fromItem?.cost);
  const paid = (next: InventoryState): InventoryState => ({
    ...next,
    gold: next.gold + sellQty * cost,
  });

  switch (from.location) {
    case "inventory": {
      const { result } = subtractInventoryItemAtId(state.inventory, from.itemId, sellQty);
      return paid({ ...state, inventory: result });
    }
    case "bag":
      if (!from.bagId) return null;
      return paid({ ...state, inventory: deleteBagItemAtId(state.inventory, from.itemId) });
    case "equipment":
      return paid({ ...state, equipment: withoutSlot(state.equipment, from.slot) });
    case "abilities": {
      const amount: any = fromItem?.amount;
      const abilities =
        sellQty >= amount
          ? deleteAbilityAtId(state.abilities, from.itemId)
          : subtractAbilityAtId(state.abilities, from.itemId, sellQty).result;
      return paid({ ...state, abilities });
    }
    default:
      return state;
  }
}
