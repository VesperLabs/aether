import { MAX_INVENTORY_ITEMS } from "@/shared/rules/inventory";
import {
  acceptQuest,
  completeQuest,
  getPlayerQuestStatus,
  takeQuestItems,
  type QuestProgressInput,
} from "@/shared/rules/quests";

/** The parts of a live player that quest turn-in reads and changes. */
interface QuestPlayer {
  quests: PlayerQuest[];
  npcKills: Record<string, number>;
  inventory: QuestProgressInput["inventory"];
  abilities: QuestProgressInput["abilities"];
  gold: number;
  addInventoryItem(item: Item): void;
  assignExp(amount: number): boolean;
}

/**
 * Legacy adapter for the pure `acceptQuest` rule: adds the quest to the player unless they
 * already have it.
 */
export function applyAcceptQuest(player: QuestPlayer, quest: Quest) {
  const record = acceptQuest(player, quest?.id);
  if (record) player.quests.push(record);
}

/**
 * Legacy adapter for the pure `completeQuest` rule: when the rule allows it, takes the quest
 * items, hands the player the reward items, awards exp and gold, and marks the quest completed.
 * On an error nothing is changed.
 */
export function applyCompleteQuest(
  player: QuestPlayer,
  quest: Quest | undefined,
): { error?: string; didLevel?: boolean } {
  const result = completeQuest({
    status: getPlayerQuestStatus(player, quest),
    quest,
    inventory: player.inventory,
    abilities: player.abilities,
    maxInventoryItems: MAX_INVENTORY_ITEMS,
  });
  if (result.error) return { error: result.error };

  for (const { item, amount } of result.itemsToRemove) {
    const taken = takeQuestItems(player, item, amount);
    if (taken) {
      player.inventory = taken.inventory;
      player.abilities = taken.abilities;
    }
  }
  for (const item of result.itemsToAdd) player.addInventoryItem(item as Item);
  const didLevel = player.assignExp(result.exp as number);
  player.gold += result.gold;
  (player.quests.find((q) => q?.questId === quest?.id) as PlayerQuest).isCompleted = true;
  return { didLevel };
}
