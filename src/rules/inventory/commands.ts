import { consumeItem, type IsReadyToConsume } from "./consume";
import { dropItem } from "./drop";
import type { DropRequest } from "./drop";
import type { ConsumeRequest } from "./consume";
import { moveItem } from "./move";
import type { InventoryItem, InventoryState, MoveContext, MoveRequest } from "./types";

/**
 * Inventory commands: a validated network command goes through the pure rules and the result is
 * stored back on the player. The server handler only finds the player, applies side effects
 * (loot, buffs, saving) and broadcasts.
 */

/** A player as the inventory commands see it: its inventory fields, written in place. */
export type InventoryHolder = InventoryState;

/** What a refused command tells the player, if anything. */
export interface CommandRefusal {
  ok: false;
  error?: string;
}

function readState(holder: InventoryHolder): InventoryState {
  return {
    inventory: holder.inventory,
    equipment: holder.equipment,
    abilities: holder.abilities,
    gold: holder.gold,
  };
}

function writeState(holder: InventoryHolder, state: InventoryState) {
  holder.inventory = state.inventory;
  holder.equipment = state.equipment;
  holder.abilities = state.abilities;
  holder.gold = state.gold;
}

export function moveItemCommand(
  holder: InventoryHolder,
  command: MoveRequest,
  ctx: MoveContext,
): { ok: true } | CommandRefusal {
  const result = moveItem(readState(holder), command, ctx);
  if (result.moved === false) return { ok: false, error: result.error };
  writeState(holder, result.state);
  return { ok: true };
}

const DROP_DISTANCE = 16;

/** Where a dropped item lands: one step in front of the player. */
export function dropPosition(at: { x: number; y: number; direction?: string | null }) {
  const pos = { x: at.x, y: at.y };
  if (at.direction === "left") pos.x -= DROP_DISTANCE;
  if (at.direction === "right") pos.x += DROP_DISTANCE;
  if (at.direction === "up") pos.y -= DROP_DISTANCE;
  if (at.direction === "down") pos.y += DROP_DISTANCE;
  return pos;
}

export function dropItemCommand(
  holder: InventoryHolder,
  command: DropRequest,
): { ok: true; item: InventoryItem } | CommandRefusal {
  const result = dropItem(readState(holder), command);
  if (result.dropped === false) return { ok: false, error: result.error };
  writeState(holder, result.state);
  return { ok: true, item: result.item };
}

export function consumeItemCommand(
  holder: InventoryHolder,
  command: ConsumeRequest,
  isReady?: IsReadyToConsume,
) {
  const result = consumeItem(readState(holder), command, isReady);
  if (result.consumed) writeState(holder, result.state);
  return result;
}
