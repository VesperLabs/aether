/** How many slots the main inventory holds. */
export const MAX_INVENTORY_ITEMS = 32;

/** Shops sell at their listed price times this; players get the plain price back. */
export const SHOP_INFLATION = 4;

export const POTION_BASES = ["hpPotion", "mpPotion"];
export const CONSUMABLES_BASES = ["food", ...POTION_BASES];
