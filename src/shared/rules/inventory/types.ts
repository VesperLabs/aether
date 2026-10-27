/**
 * Plain data the inventory rules read and return. Rules never touch a character: the legacy
 * adapter (`server/player-inventory.ts`) copies a player's fields in and stores the result back.
 */

/** An item as the inventory rules see it. Only the fields the rules read are named. */
export interface InventoryItem {
  id?: string;
  base?: string;
  slot?: string;
  type?: string;
  amount?: number | string;
  cost?: number;
  effects?: Record<string, any>;
  buffs?: Record<string, any>;
  /** Contents of a bag. */
  items?: (InventoryItem | null | undefined)[];
  /** How many slots a bag has. */
  space?: number;
  [key: string]: any;
}

export type ItemSlotValue = InventoryItem | null | undefined;

/** Everything a move, drop or consume can change. */
export interface InventoryState {
  /** The main inventory. Bags in it hold their own `items`. */
  inventory: ItemSlotValue[];
  equipment: Record<string, ItemSlotValue>;
  abilities: Record<string, ItemSlotValue>;
  gold: number;
}

/** One end of a move: where an item is, or where it should go. */
export interface MoveEndpoint {
  /** "inventory", "equipment", "abilities", "bag" or "shop". */
  location?: string | null;
  /** Slot index or slot name, depending on the location. */
  slot?: number | string | null;
  bagId?: string | null;
  /** How many to sell or buy. */
  amount?: number | string | null;
}

export interface MoveRequest {
  from?: MoveEndpoint | null;
  to?: MoveEndpoint | null;
}

export interface ShopSlot {
  item?: InventoryItem | null;
  stock?: number | null;
}

/** What the world tells a move: the shop the player is talking to and a way to make ids. */
export interface MoveContext {
  shop?: {
    /** The shop keeper the player has targeted, if any. */
    npcId?: string | null;
    /** The keeper's shop slot the move starts from. */
    slot?: ShopSlot | null;
  };
  /** Makes a unique id for a freshly bought item. */
  newId: () => string;
}

/** A move that changed (or deliberately left alone) the state. */
export interface MoveApplied {
  moved: true;
  state: InventoryState;
}

/** A move that was refused. `error` is shown to the player; without it the refusal is silent. */
export interface MoveRejected {
  moved: false;
  error?: string;
}

export type MoveResult = MoveApplied | MoveRejected;
