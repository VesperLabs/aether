import { z } from "zod";
import { ItemBuilder, type Dice, type Item } from "@/content";

/**
 * An item as saved: only what a player owns. Everything else (stats, name, look, cost, a
 * unique's mod) comes from content when it loads, so balance changes reach saved items as-is.
 * Stackables are their key and amount; gear keeps its id, its slotted mods and a bag's contents.
 */
const stackableSchema = z.object({ key: z.string(), amount: z.number().int().positive() });

const ownedSchema = z.object({
  id: z.string(),
  key: z.string(),
  mods: z.array(z.string().nullable()).optional(),
  get items(): z.ZodOptional<z.ZodArray<z.ZodNullable<typeof savedItemSchema>>> {
    return z.array(savedItemSchema.nullable()).optional();
  },
});

const savedItemSchema: z.ZodUnion<[typeof ownedSchema, typeof stackableSchema]> = z.union([
  ownedSchema,
  stackableSchema,
]);

export type SavedItem = z.infer<typeof savedItemSchema>;

export function toSavedItem(item: Item): SavedItem {
  if (item.slot === "stackable") return { key: item.key, amount: item.amount };
  return {
    id: item.id,
    key: item.key,
    ...(item.mods?.length && { mods: item.mods }),
    ...(item.space && { items: (item.items ?? []).map((inner) => inner && toSavedItem(inner)) }),
  };
}

/**
 * Rebuilds a saved item from content. `null` for anything content no longer has: an unknown key
 * drops the item, and a mod that's gone or no longer fits empties its slot.
 */
export function hydrateItem(dice: Dice, stored: unknown): Item | null {
  const parsed = savedItemSchema.safeParse(stored);
  if (!parsed.success) return null;
  const saved = parsed.data;
  const owned = "id" in saved ? saved : undefined;
  const amount = "amount" in saved ? saved.amount : 1;
  const item = ItemBuilder.buildItem(dice, { key: saved.key, slots: owned?.mods?.length }, amount);
  if (!item) return null;
  if (!owned) return item;

  const loaded = ItemBuilder.withMods(item, owned.mods ?? []);
  loaded.id = owned.id;
  if (loaded.space) {
    loaded.items = (loaded.items ?? []).map((_, i) => hydrateItem(dice, owned.items?.[i]));
  }
  return loaded;
}

type Slots<T> = T[] | Record<string, T>;

/** Applies `toSavedItem` to every slot of a list or a slot record, keeping empty slots. */
export function toSavedSlots(slots: Slots<Item | null | undefined> | undefined) {
  return mapSlots(slots, (item) => item && toSavedItem(item));
}

/** Applies `hydrateItem` to every slot of a list or a slot record, keeping empty slots. */
export function hydrateSlots(dice: Dice, slots: unknown) {
  return mapSlots(slots as Slots<unknown> | undefined, (stored) => hydrateItem(dice, stored));
}

function mapSlots<T, U>(slots: Slots<T> | undefined, map: (value: T) => U) {
  if (!slots) return slots;
  if (Array.isArray(slots)) return slots.map(map);
  return Object.fromEntries(Object.entries(slots).map(([slot, value]) => [slot, map(value)]));
}
