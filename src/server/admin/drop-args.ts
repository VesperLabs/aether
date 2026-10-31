import { canRollRarity, findItemKey, isItemBuildRarity } from "@/content";

export interface DropArgs {
  type: string;
  rarity: string;
  key: string;
  amount: number;
}

export const DROP_USAGE =
  "Usage: /drop <item> [rarity] [amount], e.g. /drop sword, /drop sword magic, /drop potion 20";

/**
 * Reads `/drop` args: `<item> [rarity] [amount]` in any order after the item, where the item's
 * type and default rarity come from its key. The old `<type>-<rarity>-<key>-<amount>` still works.
 */
export function parseDropArgs(args: string[]): DropArgs | { error: string } {
  const [first, ...rest] = args.filter(Boolean);
  if (!first) return { error: DROP_USAGE };

  const legacy = first.split("-");
  if (legacy.length === 4 && rest.length === 0) {
    const [type, rarity, key, amount] = legacy;
    return { type, rarity, key, amount: Number(amount) || 1 };
  }

  const entry = findItemKey(first);
  if (!entry) return { error: `No item called "${first}". ${DROP_USAGE}` };

  let rarity = entry.rarity;
  let amount = 1;
  for (const arg of rest) {
    if (isItemBuildRarity(arg.toLowerCase())) rarity = arg.toLowerCase();
    else if (/^\d+$/.test(arg) && Number(arg) > 0) amount = Number(arg);
    else return { error: `Don't know "${arg}". ${DROP_USAGE}` };
  }
  if (rarity !== entry.rarity && (entry.rarity !== "common" || !canRollRarity(entry.type))) {
    return { error: `${entry.name} is always ${entry.rarity}.` };
  }
  return { type: entry.type, rarity, key: entry.key, amount };
}
