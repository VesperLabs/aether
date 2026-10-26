import { MAX_INVENTORY_ITEMS } from "@/shared/utils";
import { acceptQuest, completeQuest, getPlayerQuestStatus } from "@/shared/rules/quests";

/** The parts of a live player that quest turn-in reads and changes. */
interface QuestPlayer {
  quests: PlayerQuest[];
  npcKills: Record<string, number>;
  inventory: any;
  abilities: any;
  gold: number;
  isInventoryFull(): boolean;
  addInventoryItem(item: Item): void;
  subtractInventoryItemAtId(id: string, amount: number): unknown;
  subtractBagItemAtId(id: string, amount: number): unknown;
  subtractAbilityAtId(id: string, amount: number): unknown;
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
 * Legacy adapter for the pure `completeQuest` rule: hands the player the reward items, takes the
 * quest items, awards exp and gold, and marks the quest completed.
 */
export function applyCompleteQuest(
  player: QuestPlayer,
  quest: Quest | undefined,
): { error?: string; didLevel?: boolean } {
  const result = completeQuest({
    status: getPlayerQuestStatus(player, quest),
    quest,
    inventory: player.inventory,
    maxInventoryItems: MAX_INVENTORY_ITEMS,
  });
  for (const item of result.itemsToAdd) player.addInventoryItem(item as Item);
  if (result.error) return { error: result.error };

  for (const { itemId, amount } of result.itemsToRemove) {
    player.subtractInventoryItemAtId(itemId, amount) ||
      player.subtractBagItemAtId(itemId, amount) ||
      player.subtractAbilityAtId(itemId, amount);
  }
  const didLevel = player.assignExp(result.exp as number);
  player.gold += result.gold;
  (player.quests.find((q) => q?.questId === quest?.id) as PlayerQuest).isCompleted = true;
  return { didLevel };
}
