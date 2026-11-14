import {
  ItemBuilder,
  PREVIEW_DICE,
  actors,
  type ActorDefinition,
  type ActorId,
  type Quest,
  type QuestObjective,
} from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";

/** The actor who hands out `quest`, if any. */
export function questGiver(questId: string) {
  const all = Object.values(actors) as ActorDefinition[];
  return all.find((actor) => (actor.quests as readonly string[] | undefined)?.includes(questId));
}

/** The icon for a quest's kind: a bounty, a collection, an errand, or anything else. */
export function questIcon(quest: Quest) {
  const has = (type: QuestObjective["type"]) => quest.objectives?.some((o) => o?.type === type);
  if (has("bounty")) return "./assets/icons/bounty.png";
  if (has("item")) return "./assets/icons/paper.png";
  if (has("chat")) return "./assets/icons/letter.png";
  return "./assets/icons/chest.png";
}

/** One objective as bold HTML: "Slay 5 Crabs", with progress once the quest is under way. */
function objectiveText(
  objective: QuestObjective,
  progress: number | undefined,
  inProgress: boolean,
) {
  if (objective?.type === "chat") {
    const keeperName = actors[objective?.keeper as ActorId]?.profile?.userName;
    return `<strong>Talk to ${keeperName}</strong>`;
  }
  let verb = "";
  let noun: string | undefined;
  if (objective?.type === "item" && objective.item) {
    verb = "Collect";
    noun = ItemBuilder.buildItem(PREVIEW_DICE, objective.item)?.name;
  }
  if (objective?.type === "bounty") {
    verb = "Slay";
    noun = actors[objective?.monster as ActorId]?.profile?.userName;
  }
  const goal = objective?.amount as number;
  const amount = inProgress ? `(${Math.min(progress ?? 0, goal)}/${goal})` : `${goal}`;
  const plural = goal > 1 && !(noun as string).endsWith("s") ? "s" : "";
  return `<strong>${verb} ${amount} ${noun}${plural}</strong>`;
}

/** The quest's description as HTML, its `{objective}` filled in with the player's progress. */
export function questDescription(quest: Quest, playerQuest: PlayerQuestStatus | undefined) {
  const inProgress = !!playerQuest && !playerQuest.isCompleted;
  const objectives = quest?.objectives?.map((objective, idx) => {
    const status = playerQuest?.objectives?.[idx];
    return objectiveText(objective, status?.numCollected || status?.numKilled, inProgress);
  });
  return quest?.dialogues?.description?.replace("{objective}", objectives?.join(", ") ?? "");
}
