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

  constructor(item) {
    this.id = item?.id;
    this.key = item?.key;
    this.ilvl = item?.ilvl;
    this.stats = item?.stats;
    this.rarity = item?.rarity;
    this.name = item?.name;
    this.base = item?.base;
    this.slot = item?.slot;
    this.texture = item?.texture;
    this.tint = item?.tint;
    this.attackTint = item?.attackTint;
    this.amount = item?.amount || 1;
    this.type = item?.type;
    this.requirements = item?.requirements;
    this.cost = item?.cost;
    this.effects = item?.effects;
    this.buffs = item?.buffs;
    this.percentStats = item?.percentStats;
    this.setName = item?.setName;
    this.setBonus = item?.setBonus;
    this.mpCost = item?.mpCost;
  }
}

export default Item;
