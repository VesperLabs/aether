import type { BuffName } from "../buffs/buff-list";
import type { TriggerDefinition } from "../buffs/trigger-types";
import type { SpellName } from "../spells/spell-details";
import type { CharClass, EffectBlock, PercentStatBlock, StatBlock } from "../stats";

export const ITEM_RARITIES = ["common", "magic", "rare", "unique", "set"] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

type ItemSlot =
  | "hands"
  | "helmet"
  | "armor"
  | "gloves"
  | "boots"
  | "pants"
  | "accessory"
  | "ring"
  | "amulet"
  | "stackable"
  | "spell"
  | "bag";

interface RequirementBlock {
  readonly strength?: number;
  readonly dexterity?: number;
  readonly intelligence?: number;
  readonly vitality?: number;
  readonly charClass?: CharClass;
  readonly weaponType?: "melee";
}

/** A stackable or spell as written in its table. Higher tiers may omit what their base provides. */
export interface ItemDefinition {
  /**
   * How strong the item is: its base's stats times the tier. Tier 1 is level 1, and each tier adds
   * 8 levels (2 is 9, 3 is 17), which is the level needed to wear it and which monsters drop it.
   */
  readonly tier?: number;
  readonly base: string;
  readonly name?: string;
  /**
   * A line or two of flavour text shown in the wiki. Only on the definition: `Item` doesn't copy
   * it, so it never reaches saved characters or the network.
   */
  readonly flavor?: string;
  readonly texture?: string;
  readonly slot?: ItemSlot;
  readonly tint?: string;
  readonly stats?: StatBlock;
  readonly percentStats?: PercentStatBlock;
  readonly requirements?: RequirementBlock;
  readonly effects?: EffectBlock;
  readonly buffs?: { readonly [K in BuffName]?: number };
  readonly triggers?: readonly TriggerDefinition[];
  readonly exclusive?: boolean;
  readonly cost?: number;
  readonly space?: number;
}

export interface SpellItemDefinition extends ItemDefinition {
  readonly base: SpellName;
  /** The spell's rank: Fireball 2 is tier 2. */
  readonly tier: number;
}

export type ItemRarityTable<D extends ItemDefinition = ItemDefinition> = {
  readonly [R in ItemRarity]?: { readonly [key: string]: D };
};

/** A built item: a definition with rolled stats, a unique id and an amount. */
export interface BuiltItem {
  id: string;
  key: string;
  level: number;
  /** Spells only: the spell's tier. */
  rank?: number;
  rarity: string;
  tier?: number;
  /** Gear only: its mod slots, `null` while empty. How many it has is its rarity. */
  mods?: (string | null)[];
  /** Cards only: the mod the card puts in a slot. */
  mod?: string;
  /** A unique's or set piece's own mod, on top of its slots. */
  fixedMod?: string;
  name: string;
  base: string;
  slot: string;
  texture: string;
  tint?: string;
  attackTint?: string;
  amount: number;
  type?: string;
  stats?: Record<string, number>;
  requirements?: Record<string, number | string>;
  cost?: number;
  effects?: Record<string, number>;
  buffs?: Record<string, number>;
  triggers?: TriggerDefinition[];
  percentStats?: Record<string, number>;
  setName?: string;
  setBonus?: Record<string, number>;
  space?: number;
  exclusive?: boolean;
  items?: (BuiltItem | null)[];
}
