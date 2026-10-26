import { ItemBuilder } from "../items/item-builder";
import { cloneJson } from "../random";
import { questList, type QuestId } from "./quest-list";
import { Quest, type QuestObjective } from "./quest";

/* Rewards scale with the quest level: half and a tenth of the exp needed for level 1 (50). */
export const QUEST_EXP_MULTIPLIER = 25;
export const QUEST_GOLD_MULTIPLIER = 5;

type QuestEntry = (typeof questList)[QuestId];

function buildQuest(key: string): Quest {
  const quest = (questList as Record<string, QuestEntry>)[key];
  const rewardItems = "rewards" in quest ? quest.rewards.items : undefined;
  const questData = {
    id: key,
    ...cloneJson(quest),
    objectives: quest?.objectives?.map((o, idx) =>
      cloneJson({ ...o, questId: key, id: idx } as QuestObjective),
    ),
    rewards: {
      exp: quest?.level * QUEST_EXP_MULTIPLIER,
      gold: quest?.level * QUEST_GOLD_MULTIPLIER,
      items: rewardItems?.map((item) => ItemBuilder.buildItem(item[0], item[1], item[2])),
    },
  };
  return new Quest(questData as never);
}

function buildAllQuests(): Record<string, Quest> {
  const quests: Record<string, Quest> = {};
  for (const key in questList) {
    quests[key] = buildQuest(key);
  }
  return quests;
}

export const QuestBuilder = { buildQuest, buildAllQuests };
