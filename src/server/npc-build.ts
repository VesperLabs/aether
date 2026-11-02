import { ItemBuilder, type Dice, type Item } from "@/content";
import { SHOP_INFLATION } from "@/rules/inventory";

/** An item as the content tables list it: type, rarity, key and an optional amount. */
export type ItemRecipe =
  Parameters<typeof ItemBuilder.buildItem> extends [Dice, ...infer Recipe] ? Recipe : never;

/** One line of a shopkeeper's stock, as defined in the keeper content. */
export interface ShopEntry {
  item: ItemRecipe;
  [property: string]: unknown;
}

export const buildEquipment = (dice: Dice, equipment: Record<string, ItemRecipe | undefined>) =>
  Object.entries(equipment).reduce<Record<string, Item | null>>((acc, [slot, itemArray]) => {
    acc[slot] = itemArray?.length ? ItemBuilder.buildItem(dice, ...itemArray) : null;
    return acc;
  }, {});

export const buildShop = (dice: Dice, shop: Array<ShopEntry> | undefined) => {
  return shop?.reduce<Array<Omit<ShopEntry, "item"> & { id: string; item: Item | null }>>(
    (acc, entry) => {
      const id = dice.newId();
      const item = ItemBuilder.buildItem(dice, ...entry.item);
      if (item) item.cost = Math.round((item.cost ?? 0) * SHOP_INFLATION);
      acc.push({ id, ...entry, item });
      return acc;
    },
    [],
  );
};
