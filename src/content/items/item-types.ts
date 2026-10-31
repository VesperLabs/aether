import type { BuffName } from "../buffs/buff-list";
import type { TriggerDefinition } from "../buffs/trigger-types";
import type { SpellName } from "../spells/spell-details";
import type { CharClass, EffectBlock, PercentStatBlock, StatBlock } from "../stats";
import type { ItemSetName } from "./item-sets";

export type ItemRarity = "common" | "magic" | "rare" | "unique" | "set";

export type ItemSlot =
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

export interface RequirementBlock {
  readonly strength?: number;
  readonly dexterity?: number;
  readonly intelligence?: number;
  readonly vitality?: number;
  readonly charClass?: CharClass;
  readonly weaponType?: "melee";
}

/** An item as written in the content files. Common items may omit what their base provides. */
export interface ItemDefinition {
  readonly ilvl: number;
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
}

export type ItemRarityTable<D extends ItemDefinition = ItemDefinition> = {
  readonly [R in ItemRarity]?: { readonly [key: string]: D };
};

/** A built item: a definition with rolled stats, a unique id and an amount. */
export interface BuiltItem {
  id: string;
  key: string;
  ilvl: number;
  rarity: string;
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
