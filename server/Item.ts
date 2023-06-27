class Item implements Item {
  id: string;
  key: string;
  ilvl: number;
  rarity: string;
  stats?: Record<string, number>;
  name: string;
  base: string;
  slot: string;
  texture: string;
  tint?: string;
  attackTint?: string;
  amount: number;
  type?: string;
  requirements?: Record<string, number>;
  cost?: number;
  effects?: Record<string, any>;
  buffs?: Record<string, any>;
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
  mpCost?: number;
  space?: number; // amount of slots on bags
  exclusive: boolean; // cannot be dropped on world
  items?: Array<Item>;

  constructor(item) {
    const properties = [
      "id",
      "key",
      "ilvl",
      "stats",
      "rarity",
      "name",
      "base",
      "slot",
      "texture",
      "tint",
      "attackTint",
      "amount",
      "type",
      "requirements",
      "cost",
      "effects",
      "buffs",
      "percentStats",
      "setName",
      "setBonus",
      "mpCost",
      "space",
      "exclusive",
      "items",
    ];
    for (const prop of properties) {
      if (item?.[prop] !== null && item?.[prop] !== undefined) {
        this[prop] = item[prop];
      } else if (prop === "amount") {
        this.amount = 1;
      } else if (prop === "items") {
        this.items = [];
      }
    }
  }
}

export default Item;
