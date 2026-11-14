import { ItemBuilder, type AnyItemRef, type Dice, type Item } from "@/content";
import { SHOP_INFLATION } from "@/rules/inventory";

/** An item as the content lists it: its key, or its key and how many blank mod slots. */
export type ItemRecipe = AnyItemRef;

/** One line of a shopkeeper's stock, as defined in the keeper content. */
export interface ShopEntry {
  item: ItemRecipe;
  [property: string]: unknown;
}

export const buildEquipment = (dice: Dice, equipment: Record<string, ItemRecipe | undefined>) =>
  Object.entries(equipment).reduce<Record<string, Item | null>>((acc, [slot, ref]) => {
    acc[slot] = ref ? ItemBuilder.buildItem(dice, ref) : null;
    return acc;
  }, {});

export const buildShop = (dice: Dice, shop: Array<ShopEntry> | undefined) => {
  return shop?.reduce<Array<Omit<ShopEntry, "item"> & { id: string; item: Item | null }>>(
    (acc, entry) => {
      const id = dice.newId();
      const item = ItemBuilder.buildItem(dice, entry.item);
      if (item) item.cost = Math.round((item.cost ?? 0) * SHOP_INFLATION);
      acc.push({ id, ...entry, item });
      return acc;
    },
    [],
  );
};
