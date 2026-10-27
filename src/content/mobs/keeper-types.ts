import type { ItemRef } from "../items/item-refs";
import type { QuestId } from "../quests/quest-list";
import type { MobBase, MobEquipment } from "./mob-types";

export interface ShopEntry {
  readonly item: ItemRef;
  readonly stock: number;
}

export interface KeeperDefinition extends MobBase {
  readonly state?: { readonly isStatic?: boolean };
  readonly equipment?: MobEquipment;
  readonly keeperData: {
    readonly dialogues: {
      readonly greet?: string;
      readonly quests?: string;
      readonly shop?: string;
      readonly home?: string;
    };
    readonly quests?: readonly QuestId[];
    readonly shop?: readonly ShopEntry[];
    readonly home?: { readonly x: number; readonly y: number };
  };
}
