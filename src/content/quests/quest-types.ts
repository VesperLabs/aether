import type { ItemRef } from "../items/item-refs";
import type { NastyId } from "../mobs/nasties";

export type QuestObjectiveDefinition =
  /** Talk to a keeper. The keeper id is checked against the keepers in `mobs/keepers.ts`. */
  | { readonly type: "chat"; readonly keeper: string }
  | { readonly type: "bounty"; readonly monster: NastyId; readonly amount: number }
  | { readonly type: "item"; readonly item: ItemRef; readonly amount: number };

export interface QuestDefinition {
  readonly level: number;
  readonly name: string;
  readonly dialogues: { readonly description: string };
  readonly objectives: readonly QuestObjectiveDefinition[];
  readonly rewards?: { readonly items: readonly ItemRef[] };
}
