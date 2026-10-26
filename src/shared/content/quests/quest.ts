import type { BuiltItem } from "../items/item-types";

export interface QuestRewards {
  exp: number;
  gold: number;
  items?: (BuiltItem | null)[];
}

export interface QuestObjective {
  type: string;
  /** Position of the objective within its quest. */
  id: number;
  questId: string;
  keeper?: string;
  monster?: string;
  item?: string[];
  amount?: number;
}

export interface QuestArgs {
  id: string;
  name: string;
  dialogues: { description: string };
  objectives: QuestObjective[];
  rewards?: Partial<QuestRewards>;
}

/** A quest as the server hands it out: objectives numbered, rewards built from the quest level. */
export class Quest {
  id: string;
  name: string;
  dialogues: { description: string };
  objectives: QuestObjective[];
  rewards: Partial<QuestRewards>;

  constructor(args: QuestArgs) {
    this.id = args?.id;
    this.name = args?.name;
    this.dialogues = args?.dialogues;
    this.rewards = {
      exp: args?.rewards?.exp,
      gold: args?.rewards?.gold,
      items: args?.rewards?.items,
    };
    this.objectives = args?.objectives;
  }
}
