import crypto from "crypto";
import { ItemBuilder, type Item } from "@/content";
import { SHOP_INFLATION } from "@/rules/inventory";

/** An item as the content tables list it: type, rarity, key and an optional amount. */
export type ItemRecipe = Parameters<typeof ItemBuilder.buildItem>;

/** One line of a shopkeeper's stock, as defined in the keeper content. */
export interface ShopEntry {
  item: ItemRecipe;
  [property: string]: unknown;
}

export const buildEquipment = (equipment: Record<string, ItemRecipe | undefined>) =>
  Object.entries(equipment).reduce<Record<string, Item | null>>((acc, [slot, itemArray]) => {
    acc[slot] = itemArray?.length ? ItemBuilder.buildItem(...itemArray) : null;
    return acc;
  }, {});

export const buildShop = (shop: Array<ShopEntry> | undefined) => {
  return shop?.reduce<Array<Omit<ShopEntry, "item"> & { id: string; item: Item | null }>>(
    (acc, entry) => {
      const id = crypto.randomUUID();
      const item = ItemBuilder.buildItem(...entry.item);
      if (item) item.cost = Math.round((item.cost ?? 0) * SHOP_INFLATION);
      acc.push({ id, ...entry, item });
      return acc;
    },
    [],
  );
};
