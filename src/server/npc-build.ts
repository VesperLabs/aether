import crypto from "crypto";
import { ItemBuilder } from "@/shared/content";
import { SHOP_INFLATION } from "@/shared/rules/inventory";

export const buildEquipment = (equipment: Record<string, Array<string>>) =>
  Object?.entries(equipment).reduce((acc, [slot, itemArray]: [string, BuildItem]) => {
    acc[slot] = itemArray?.length ? ItemBuilder.buildItem(...itemArray) : null;
    return acc;
  }, {});

export const buildShop = (shop: Array<any>) => {
  return shop?.reduce((acc, entry) => {
    const id = crypto.randomUUID();
    const item: Item | void = ItemBuilder.buildItem(...entry.item);
    if (item) item.cost = Math.round(item.cost * SHOP_INFLATION);
    acc.push({ id, ...entry, item });
    return acc;
  }, []);
};
