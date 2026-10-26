import { buyItem } from "./move-buy";
import { resolveMove } from "./move-resolve";
import { sellItem } from "./move-sell";
import { transferItem } from "./move-transfer";
import type {
  InventoryState,
  MoveApplied,
  MoveContext,
  MoveRejected,
  MoveRequest,
  MoveResult,
} from "./types";

const applied = (state: InventoryState): MoveApplied => ({ moved: true, state });
const rejected: MoveRejected = { moved: false };

/**
 * Moves an item from one place to another: between the inventory, equipment, abilities and
 * bags, or to and from a shop (selling and buying). Never changes `state`; returns the new
 * state, or a refusal (with an error message for the player when there is one).
 */
export function moveItem(
  state: InventoryState,
  { from, to }: MoveRequest,
  context: MoveContext,
): MoveResult {
  if (!from || !to) return rejected;
  const resolved = resolveMove(state, from, to, context);
  if ("moved" in resolved) return resolved;

  if (to.location === "shop") {
    const sold = sellItem(state, resolved);
    return sold ? applied(sold) : rejected;
  }
  if (from.location === "shop") {
    const bought = buyItem(state, resolved);
    return "moved" in bought ? bought : applied(bought);
  }
  const transferred = transferItem(state, resolved);
  return transferred ? applied(transferred) : rejected;
}
