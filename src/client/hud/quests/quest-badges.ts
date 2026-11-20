import type { PlayerQuestStatus } from "@/rules/quests";

type HeroQuest = Pick<PlayerQuestStatus, "questId" | "isReady" | "isCompleted">;

/** The hero's quests that are done and waiting to be turned in. */
export const countQuestsToTurnIn = (heroQuests: HeroQuest[] | undefined) =>
  (heroQuests ?? []).filter((q) => q?.isReady && !q?.isCompleted).length;

/** A keeper's quests the hero can act on now: not yet taken, or ready to turn in. */
export const countKeeperQuestsToAct = (
  keeperQuests: { id?: string }[] | undefined,
  heroQuests: HeroQuest[] | undefined,
) =>
  (keeperQuests ?? []).filter((quest) => {
    const mine = heroQuests?.find((q) => q?.questId === quest?.id);
    return !mine || (mine.isReady && !mine.isCompleted);
  }).length;
