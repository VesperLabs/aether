import type { InventoryItem, ItemSlotValue } from "./types";

/** Whether an item made for slot `s1` fits slot `s2` ("hands" fits either hand, "ring" either ring). */
export function checkSlotsMatch(s1?: string | null, s2?: string | null): boolean {
  const handNames = ["handLeft", "handRight"];
  const ringNames = ["ring1", "ring2"];
  if (s1 === s2) return true;
  if (s1 === "hands" && s2 && handNames.includes(s2)) return true;
  if (s2 === "hands" && s1 && handNames.includes(s1)) return true;
  if (s1 === "ring" && s2 && ringNames.includes(s2)) return true;
  if (s2 === "ring" && s1 && ringNames.includes(s1)) return true;
  return false;
}

/** A deep copy of an item (or null for nothing), so a rule can edit it freely. */
export function cloneItem(item: InventoryItem | null | undefined): InventoryItem | null {
  return item ? JSON.parse(JSON.stringify(item)) : null;
}

/** A copy of an array or record with one slot set. Holes in arrays stay holes. */
export function withSlot<T extends ItemSlotValue[] | Record<string, ItemSlotValue>>(
  container: T,
  slot: number | string | null | undefined,
  value: ItemSlotValue,
): T {
  if (Array.isArray(container)) {
    const copy = container.slice();
    copy[slot as number] = value;
    return copy as T;
  }
  return { ...container, [slot as string]: value };
}

/** A copy of a record with a slot emptied. A slot that is already empty is left alone. */
export function withoutSlot<T extends ItemSlotValue[] | Record<string, ItemSlotValue>>(
  container: T,
  slot: number | string | null | undefined,
): T {
  if (!(container as Record<string, ItemSlotValue>)?.[slot as string]) return container;
  return withSlot(container, slot, null);
}

/** Parses a quantity the way the client sends it: absolute value, or 1 when missing or invalid. */
export function toQuantity(value: unknown): number {
  return Math.abs(parseInt(String(value))) || 1;
}
