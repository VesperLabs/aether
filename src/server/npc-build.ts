import { ItemBuilder, readRef, rollSlots, type AnyItemRef, type Dice, type Item } from "@/content";
import { SHOP_INFLATION } from "@/rules/inventory";

/** An actor as content defines it, before it is placed in a world. */
// Legacy: `NpcArgs` mixes content with placement; type this as `ActorDefinition` once they split.
// oxlint-disable-next-line typescript/no-explicit-any
export type NpcDefinition = Record<string, any>;

/** An item as the content lists it: its key, or its key and how many blank mod slots. */
export type ItemRecipe = AnyItemRef;

/** One line of a shopkeeper's stock, as defined in the keeper content. */
export interface ShopEntry {
  item: ItemRecipe;
  /** How many a stackable line sells per day. Anything else sells one a day. */
  stock?: number;
  [property: string]: unknown;
}

/** One built shelf slot: the item on sale and how many are left today. */
export type ShopSlot = Omit<ShopEntry, "item"> & { id: string; item: Item | null; stock: number };

export const buildEquipment = (dice: Dice, equipment: Record<string, ItemRecipe | undefined>) =>
  Object.entries(equipment).reduce<Record<string, Item | null>>((acc, [slot, ref]) => {
    acc[slot] = ref ? ItemBuilder.buildItem(dice, ref) : null;
    return acc;
  }, {});

/**
 * Today's shelves. Gear rolls its mod slots at world drop odds unless the content sets them, and
 * sells once; stackables sell up to their daily `stock`.
 */
export const buildShop = (dice: Dice, shop: Array<ShopEntry> | undefined) => {
  return shop?.reduce<Array<ShopSlot>>((acc, entry) => {
    const id = dice.newId();
    const { key, slots } = readRef(entry.item);
    const item = ItemBuilder.buildItem(dice, { key, slots: slots ?? rollSlots(dice) });
    if (item) item.cost = Math.round((item.cost ?? 0) * SHOP_INFLATION);
    const stock = item?.type === "stackable" ? Math.max(1, entry.stock ?? 1) : 1;
    acc.push({ id, ...entry, item, stock });
    return acc;
  }, []);
};
