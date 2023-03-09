class Item {
  constructor(item) {
    this.key = item.key;
    this.ilvl = item.ilvl;
    this.stats = item.stats;
    this.rarity = item.rarity;
    this.name = item.name;
    this.base = item.base;
    this.slot = item.slot;
    this.texture = item.texture;
    this.tint = item.tint || "FFFFFF";
    this.attackTint = item.attackTint || "FFFFFF";
    this.amount = item.amount || 1;
    this.type = item.type;
    this.requirements = item.requirements;
    this.cost = item.cost;
    this.effects = item.effects;
    this.percentStats = item.percentStats;
    this.set = item.set || null;
    this.setBonus = item.setBonus || null;
  }
}

export default Item;
