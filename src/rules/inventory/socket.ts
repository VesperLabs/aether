import { canSlotMod, ItemBuilder } from "@/content";
import type { ResolvedMove } from "./move-resolve";
import { putItem } from "./move-transfer";
import type { InventoryItem, InventoryState, MoveRejected } from "./types";

/** Whether a move is a card dropped on gear: socketing, not a swap. */
export function isSocketMove({ fromItem, toItem }: ResolvedMove): boolean {
  return (
    fromItem?.base === "card" && !!toItem && !["stackable", "spell"].includes(toItem.type ?? "")
  );
}

/**
 * Sockets a card into the gear it was dropped on: its mod goes into the gear's first empty slot,
 * and one card is used up. Refused, with a reason, when the gear has no empty slot or the mod
 * can't go on it. Never changes `state`.
 */
export function socketCard(
  state: InventoryState,
  { from, to, fromItem, toItem }: ResolvedMove,
): InventoryState | MoveRejected {
  const card = fromItem as InventoryItem;
  const gear = toItem as InventoryItem;
  const mods: (string | null)[] = gear.mods ?? [];
  const open = mods.indexOf(null);
  if (!mods.length) return { moved: false, error: `${gear.name} has no mod slots.` };
  if (open === -1) return { moved: false, error: `${gear.name} has no empty mod slot.` };
  if (!canSlotMod(card.mod, gear.type ?? "")) {
    return { moved: false, error: `${card.name} can't go on ${gear.name}.` };
  }

  const socketed = ItemBuilder.withMods(gear, mods.with(open, card.mod));
  const left = Number(card.amount || 1) - 1;
  const spent = putItem(state, from, left > 0 ? { ...card, amount: left } : null);
  return (spent && putItem(spent, to, socketed)) ?? { moved: false };
}
