/** An item as quests see it: where it sits, what it is and how many. */
export interface QuestItem {
  id?: string;
  slot?: string;
  rarity?: string;
  key?: string;
  base?: string;
  amount?: number;
  /** Bags hold items of their own. */
  items?: (QuestItem | null | undefined)[];
}

/** A quest definition, reduced to what the rules read. */
export interface QuestDefinition {
  id: string;
  objectives?: QuestObjectiveDefinition[];
  rewards?: { exp?: number; gold?: number; items?: (unknown | null)[] };
}

export interface QuestObjectiveDefinition {
  type: string;
  /** `[slot, rarity, key]` of the item to collect. */
  item?: string[];
  monster?: string;
  keeper?: string;
  amount?: number;
}

/** A quest as a player carries it. */
export interface PlayerQuestRecord {
  questId: string;
  isCompleted?: boolean;
  isReady?: boolean;
}

export interface PlayerQuestObjectiveStatus {
  questId: string;
  objectiveId: number;
  isReady: boolean;
  numKilled: number;
  numCollected: number;
}

export interface PlayerQuestStatus {
  questId: string;
  isReady: boolean | undefined;
  isCompleted: boolean | undefined;
  objectives: PlayerQuestObjectiveStatus[] | undefined;
}

/** The parts of a character that quest progress is computed from. */
export interface QuestProgressInput {
  quests: PlayerQuestRecord[];
  npcKills: Record<string, number>;
  inventory: (QuestItem | null | undefined)[];
  abilities: Record<string, QuestItem | null | undefined>;
}

const matchesTarget = (item: QuestItem | null | undefined, target: string[] | undefined) =>
  item?.slot === target?.[0] && item?.rarity === target?.[1] && item?.key === target?.[2];

/** An item sitting loose in the inventory that matches `[slot, rarity, key]`. */
export function findInventoryQuestItem(
  inventory: QuestProgressInput["inventory"],
  target: string[] | undefined,
) {
  return inventory.find((i) => matchesTarget(i, target));
}

/** An item inside one of the inventory's bags that matches `[slot, rarity, key]`. */
export function findBagQuestItem(
  inventory: QuestProgressInput["inventory"],
  target: string[] | undefined,
) {
  const bags = inventory?.filter((item) => item?.base === "bag");
  for (const bag of bags) {
    const found = bag?.items?.find?.((i) => matchesTarget(i, target));
    if (found) return found;
  }
  return null;
}

/** An item in an ability slot that matches `[slot, rarity, key]`. */
export function findAbilityQuestItem(
  abilities: QuestProgressInput["abilities"],
  target: string[] | undefined,
) {
  const [, foundItem] = Object.entries(abilities).find(([, slotItem]) =>
    matchesTarget(slotItem, target),
  ) || [null, null];
  return foundItem;
}

/**
 * How far a player is with a quest. Null when the player has not accepted it.
 * Bounty objectives count kills of the monster, item objectives count the matching item
 * wherever it is carried.
 */
export function getPlayerQuestStatus(
  progress: QuestProgressInput,
  quest: Pick<QuestDefinition, "id" | "objectives"> | undefined,
): PlayerQuestStatus | null {
  const playerQuest = progress.quests.find((q) => q?.questId === quest?.id);
  if (!playerQuest) return null;
  const objectives = quest?.objectives?.reduce<PlayerQuestObjectiveStatus[]>(
    (acc, objective, idx) => {
      let isReady = false;
      let numKilled = 0;
      let numCollected = 0;
      if (objective?.type === "bounty") {
        numKilled = progress.npcKills[objective?.monster as string] || 0;
        isReady = numKilled >= (objective?.amount as number);
      }
      if (objective?.type === "item") {
        const item =
          findInventoryQuestItem(progress.inventory, objective?.item) ||
          findBagQuestItem(progress.inventory, objective?.item) ||
          findAbilityQuestItem(progress.abilities, objective?.item);
        numCollected = item?.amount || 0;
        isReady = numCollected >= (objective?.amount as number);
      }
      acc.push({
        questId: quest?.id as string,
        objectiveId: idx,
        isReady,
        numKilled,
        numCollected,
      });
      return acc;
    },
    [],
  );
  return {
    questId: quest?.id as string,
    isReady: objectives?.every((o) => o?.isReady) || playerQuest?.isReady,
    isCompleted: playerQuest?.isCompleted,
    objectives,
  };
}

/** Every quest a player carries with its progress, plus the rewards the client shows. */
export function getPlayerQuests<
  Quest extends Pick<QuestDefinition, "id" | "objectives" | "rewards">,
>(progress: QuestProgressInput, questsById: Record<string, Quest | undefined>) {
  if (!progress.quests?.length) return [];
  return progress.quests.map((q) => {
    const serverQuest = questsById[q?.questId];
    return {
      ...getPlayerQuestStatus(progress, serverQuest),
      /* The rewards are passed so the client builds items with the correct stats. */
      rewards: serverQuest?.rewards,
    };
  });
}

/** The record to add when a player accepts a quest, or null when the player already has it. */
export function acceptQuest(
  progress: Pick<QuestProgressInput, "quests">,
  questId: string,
): PlayerQuestRecord | null {
  if (progress.quests.find((q) => q?.questId === questId)) return null;
  return { questId, isCompleted: false };
}

/**
 * Talking to a keeper readies every unfinished quest with an objective that names that keeper.
 * Returns the new list of quest records.
 */
export function markKeeperObjectivesReady(
  quests: PlayerQuestRecord[],
  questsById: Record<string, Pick<QuestDefinition, "objectives"> | undefined>,
  keeperName: string,
): PlayerQuestRecord[] {
  return quests.map((playerQuest) => {
    const quest = questsById[playerQuest?.questId];
    if (quest?.objectives?.some((q) => q?.keeper === keeperName && !playerQuest.isCompleted)) {
      return { ...playerQuest, isReady: true };
    }
    return playerQuest;
  });
}

/** The kill count of `monsterName` after one more kill. */
export function nextNpcKillCount(npcKills: Record<string, number>, monsterName: string): number {
  return npcKills?.[monsterName] + 1 || 1;
}

export interface CompleteQuestInput {
  /** The player's status for the quest, from `getPlayerQuestStatus`. */
  status: Pick<PlayerQuestStatus, "isReady" | "isCompleted"> | null | undefined;
  quest: Pick<QuestDefinition, "id" | "objectives" | "rewards"> | undefined;
  /** The inventory slots (empty ones are null), to see whether reward items fit. */
  inventory: (QuestItem | null | undefined)[];
  maxInventoryItems: number;
}

export interface CompleteQuestResult {
  /** Why the quest cannot be turned in. */
  error?: string;
  /**
   * Reward items that fit in the inventory. They are given even when `error` is set, because
   * the game hands items out one by one and fails afterwards if some did not fit.
   */
  itemsToAdd: unknown[];
  /** Quest items to take from the player, by item key. */
  itemsToRemove: { itemId: string; amount: number }[];
  exp: number | undefined;
  gold: number;
}

/**
 * Turning a quest in: checks the quest is ready, works out which reward items fit and which
 * quest items are taken. Applying the result (items, exp, gold, marking it completed) is up to
 * the caller.
 */
export function completeQuest(input: CompleteQuestInput): CompleteQuestResult {
  const { status, quest, maxInventoryItems } = input;
  const rewardItems = quest?.rewards?.items || [];
  const objectives = quest?.objectives || [];
  const empty: CompleteQuestResult = { itemsToAdd: [], itemsToRemove: [], exp: undefined, gold: 0 };

  if (status?.isCompleted) return { ...empty, error: "Quest has already been completed." };
  if (!status?.isReady) return { ...empty, error: "Quest objectives are not complete." };

  /* Place reward items into a copy of the inventory the way the player's inventory does. */
  const slots: (QuestItem | null | undefined)[] = [...input.inventory];
  const itemsToAdd: unknown[] = [];
  let inventoryFull = false;
  for (const item of rewardItems) {
    if (!item) continue;
    if (slots.every(Boolean) && slots.length >= maxInventoryItems) {
      inventoryFull = true;
    } else {
      itemsToAdd.push(item);
      const free = slots.findIndex((s) => !s?.id);
      if (free === -1) slots.push({ id: "reward" });
      else slots[free] = { id: "reward" };
    }
  }
  if (inventoryFull && rewardItems.length > 0) {
    return { ...empty, itemsToAdd, error: "Cannot turn in quest. Inventory is full" };
  }

  const itemsToRemove: CompleteQuestResult["itemsToRemove"] = [];
  for (const objective of objectives) {
    if (!objective) continue;
    /* Only works for stackable items */
    if (objective.type === "item") {
      itemsToRemove.push({
        itemId: objective.item?.[2] as string,
        amount: objective.amount as number,
      });
    }
  }

  return { itemsToAdd, itemsToRemove, exp: quest?.rewards?.exp, gold: quest?.rewards?.gold ?? 0 };
}
