import type { TriggerDefinition } from "../buffs/trigger-types";
import type { PercentStatBlock, StatBlock } from "../stats";

export interface ItemSetDefinition {
  readonly name: string;
  readonly pieces: number;
  readonly stats?: StatBlock;
  readonly percentStats?: PercentStatBlock;
  readonly triggers?: readonly TriggerDefinition[];
}
