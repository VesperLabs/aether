/** How many slots the main inventory holds. */
export const MAX_INVENTORY_ITEMS = 32;

/** Shops sell at their listed price times this; players get the plain price back. */
export const SHOP_INFLATION = 4;

export const POTION_BASES = ["hpPotion", "mpPotion"];
export const CONSUMABLES_BASES = ["food", ...POTION_BASES];

/** Every equipment slot a character has, in the order the equipment menu draws them. */
export const EQUIPMENT_SLOTS = [
  "handRight",
  "handLeft",
  "helmet",
  "accessory",
  "pants",
  "armor",
  "gloves",
  "boots",
  "ring1",
  "ring2",
  "amulet",
] as const;

/** Every ability slot a character has, in action bar order. */
export const ABILITY_SLOTS = ["1", "2", "3", "4", "5", "6"] as const;
