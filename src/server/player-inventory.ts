import type { InventoryState } from "@/shared/rules/inventory";

/** The fields of a player that the inventory rules read and write. */
type InventoryHolder = InventoryState;

/**
 * Legacy adapters for the pure inventory rules: copy the player's plain data in, then store
 * the result back on the player. Delete in Phase 4 when entities become plain data.
 */
export function toInventoryState(player: InventoryHolder): InventoryState {
  return {
    inventory: player.inventory,
    equipment: player.equipment,
    abilities: player.abilities,
    gold: player.gold,
  };
}

export function applyInventoryState(player: InventoryHolder, state: InventoryState) {
  player.inventory = state.inventory;
  player.equipment = state.equipment;
  player.abilities = state.abilities;
  player.gold = state.gold;
}
