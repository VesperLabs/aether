import type { TriggerDefinition } from "../buffs/trigger-types";
import type { PercentStatBlock, StatBlock, StatName, StatRange } from "../stats";

export interface ItemSetDefinition {
  readonly name: string;
  readonly pieces: number;
  readonly stats?: StatBlock;
  readonly percentStats?: PercentStatBlock;
  readonly triggers?: readonly TriggerDefinition[];
}

/** A random suffix such as "of Strength" that magic and rare items can roll. */
export interface ItemModDefinition {
  readonly ilvl: number;
  readonly name: string;
  readonly stats: { readonly [K in StatName]?: StatRange };
  /** Item types the suffix may appear on, or "*" for all of them. */
  readonly types: readonly string[];
}
