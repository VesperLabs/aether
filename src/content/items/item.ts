import type { BuiltItem } from "./item-types";

/** An item in the world: in a bag, on a character, on the ground or in a shop. */
export class Item implements BuiltItem {
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
  requirements?: Record<string, number | string>;
  cost?: number;
  effects?: Record<string, number>;
  buffs?: Record<string, number>;
  triggers?: BuiltItem["triggers"];
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
  space?: number; // amount of slots on bags
  exclusive?: boolean; // left out of random drops; only drops from mobs that list it in their drops
  items?: (BuiltItem | null)[];

  constructor(item: Partial<BuiltItem>) {
    this.id = item?.id as string;
    this.key = item?.key as string;
    this.ilvl = item?.ilvl as number;
    this.stats = item?.stats;
    this.rarity = item?.rarity as string;
    this.name = item?.name as string;
    this.base = item?.base as string;
    this.slot = item?.slot as string;
    this.texture = item?.texture as string;
    this.tint = item?.tint;
    this.attackTint = item?.attackTint;
    this.amount = item?.amount || 1;
    this.type = item?.type;
    this.requirements = item?.requirements;
    this.cost = item?.cost;
    this.effects = item?.effects;
    this.triggers = item?.triggers;
    this.buffs = item?.buffs;
    this.percentStats = item?.percentStats;
    this.setName = item?.setName;
    this.setBonus = item?.setBonus;
    this.space = item?.space;
    this.exclusive = item?.exclusive;
    this.items = item?.items || [];
  }
}
