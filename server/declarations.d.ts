interface Item {
  id: number;
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
  amount?: number;
  type?: string;
  requirements?: Record<string, number>;
  cost?: number;
  effects?: Record<string, any>;
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
}
