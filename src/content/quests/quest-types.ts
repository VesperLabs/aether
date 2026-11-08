import type { ItemRef } from "../items/item-refs";

type QuestObjectiveDefinition =
  /* Actor ids are strings here to avoid an import cycle; `actors/actors.ts` checks them at compile time. */
  /** Talk to an actor. */
  | { readonly type: "chat"; readonly keeper: string }
  /** Kill `amount` of an actor. */
  | { readonly type: "bounty"; readonly monster: string; readonly amount: number }
  | { readonly type: "item"; readonly item: ItemRef; readonly amount: number };

export interface QuestDefinition {
  readonly level: number;
  readonly name: string;
  readonly dialogues: { readonly description: string };
  readonly objectives: readonly QuestObjectiveDefinition[];
  readonly rewards?: { readonly items: readonly ItemRef[] };
}
