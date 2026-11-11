import type { BuffName } from "../buffs/buff-list";
import type { TriggerDefinition } from "../buffs/trigger-types";
import type { SpellName } from "../spells/spell-details";
import type { CharClass, EffectBlock, PercentStatBlock, StatBlock } from "../stats";
import type { ItemSetName } from "./item-sets";

export type ItemRarity = "common" | "magic" | "rare" | "unique" | "set";

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

/** An item as written in the content files. Common items may omit what their base provides. */
export interface ItemDefinition {
  /**
   * The item's own level: how strong it is, the level needed to wear it and which monsters drop
   * it. Fixed per item; what dropped it never changes it. Spells leave it out and get it from
   * their rank.
   */
  readonly level?: number;
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
  readonly setName?: ItemSetName;
  readonly exclusive?: boolean;
  readonly cost?: number;
  readonly space?: number;
}

export interface SpellItemDefinition extends ItemDefinition {
  readonly base: SpellName;
  /** The spell's tier: Fireball 2 is rank 2. Sets its power, size and level. */
  readonly rank: number;
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
  /** The random affixes a magic or rare item rolled, by name, e.g. ["Sturdy", "of the Bear"]. */
  affixes?: string[];
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
