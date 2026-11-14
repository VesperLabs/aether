import { findItemKey, getCatalogItem, MAX_SLOTS, takesSlots } from "@/content";

export interface DropArgs {
  key: string;
  /** Blank mod slots, for gear that takes them. */
  slots: number;
  amount: number;
}

export const DROP_USAGE =
  "Usage: /drop <item> [slots | amount], e.g. /drop sword, /drop sword 3, /drop smallHpPotion 20";

/**
 * Reads `/drop` args: `<item>`, then a number that is the gear's mod slots (0–4) or a stack's
 * amount. No item takes both.
 */
export function parseDropArgs(args: string[]): DropArgs | { error: string } {
  const [first, count, ...extra] = args.filter(Boolean);
  if (!first) return { error: DROP_USAGE };

  const item = getCatalogItem(findItemKey(first)?.key ?? "");
  if (!item) return { error: `No item called "${first}". ${DROP_USAGE}` };
  if (extra.length) return { error: `Don't know "${extra.join(" ")}". ${DROP_USAGE}` };

  const dropped = { key: item.key, slots: 0, amount: 1 };
  if (count === undefined) return dropped;
  const value = /^\d+$/.test(count) ? Number(count) : NaN;
  if (takesSlots(item)) {
    if (!(value <= MAX_SLOTS)) return { error: `${item.name} takes 0 to ${MAX_SLOTS} slots.` };
    return { ...dropped, slots: value };
  }
  if (item.type === "stackable") {
    if (!(value > 0)) return { error: `Don't know "${count}". ${DROP_USAGE}` };
    return { ...dropped, amount: value };
  }
  return { error: `${item.name} is always ${item.rarity}.` };
}
