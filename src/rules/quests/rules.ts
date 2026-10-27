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
  isReady: boolean;
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
    isReady: objectives?.every((o) => o?.isReady) || playerQuest?.isReady || false,
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
  questId: string | undefined,
): PlayerQuestRecord | null {
  if (!questId) return null;
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
  /** The ability slots, which may also hold quest items. */
  abilities?: Record<string, QuestItem | null | undefined>;
  maxInventoryItems: number;
}

export interface CompleteQuestResult {
  /** Why the quest cannot be turned in. When set, nothing may be changed. */
  error?: string;
  /** Reward items to give. Empty when `error` is set. */
  itemsToAdd: unknown[];
  /** Quest items to take from the player: `[slot, rarity, key]` and how many. */
  itemsToRemove: { item: string[]; amount: number }[];
  exp: number | undefined;
  gold: number;
}

/**
 * Takes exactly `amount` of the item matching `[slot, rarity, key]`, from loose inventory stacks,
 * then bags, then abilities. Returns null (and changes nothing) when the player has fewer.
 */
export function takeQuestItems(
  carried: Pick<QuestProgressInput, "inventory" | "abilities">,
  target: string[] | undefined,
  amount: number,
): Pick<QuestProgressInput, "inventory" | "abilities"> | null {
  let left = amount;
  /* Takes from one slot, returning what the slot becomes. */
  const take = (item: QuestItem | null | undefined): QuestItem | null | undefined => {
    if (left <= 0 || !item || !matchesTarget(item, target)) return item;
    const have = item.amount ?? 1;
    const used = Math.min(have, left);
    left -= used;
    return used >= have ? null : { ...item, amount: have - used };
  };
  const inventory = carried.inventory.map((item) => take(item));
  const withBags = inventory.map((item) =>
    item?.base === "bag" && item.items ? { ...item, items: item.items.map((i) => take(i)) } : item,
  );
  const abilities: Record<string, QuestItem | null | undefined> = {};
  for (const [slotName, item] of Object.entries(carried.abilities)) {
    const next = take(item);
    if (next) abilities[slotName] = next;
  }
  if (left > 0) return null;
  return { inventory: withBags, abilities };
}

/**
 * Turning a quest in is all or nothing: checks the quest is ready, that every quest item is
 * carried and that every reward item fits once the quest items are gone. Applying the result
 * (take items, give items, exp, gold, mark completed) is up to the caller, and only when there
 * is no `error`.
 */
export function completeQuest(input: CompleteQuestInput): CompleteQuestResult {
  const { status, quest, maxInventoryItems } = input;
  const rewardItems = (quest?.rewards?.items || []).filter(Boolean);
  const objectives = quest?.objectives || [];
  const empty: CompleteQuestResult = { itemsToAdd: [], itemsToRemove: [], exp: undefined, gold: 0 };

  if (status?.isCompleted) return { ...empty, error: "Quest has already been completed." };
  if (!status?.isReady) return { ...empty, error: "Quest objectives are not complete." };

  const itemsToRemove: CompleteQuestResult["itemsToRemove"] = [];
  let carried: Pick<QuestProgressInput, "inventory" | "abilities"> = {
    inventory: input.inventory,
    abilities: input.abilities ?? {},
  };
  for (const objective of objectives) {
    if (objective?.type !== "item") continue;
    const amount = objective.amount ?? 1;
    const next = takeQuestItems(carried, objective.item, amount);
    if (!next) return { ...empty, error: "Quest objectives are not complete." };
    carried = next;
    itemsToRemove.push({ item: objective.item as string[], amount });
  }

  /* Every reward needs a slot of its own, counted after the quest items are gone. */
  const slots = carried.inventory;
  const free = slots.filter((s) => !s?.id).length + Math.max(0, maxInventoryItems - slots.length);
  if (rewardItems.length > free) {
    return { ...empty, error: "Cannot turn in quest. Inventory is full" };
  }

  return {
    itemsToAdd: rewardItems,
    itemsToRemove,
    exp: quest?.rewards?.exp,
    gold: quest?.rewards?.gold ?? 0,
  };
}
