import { QuestSlot } from "@/ui";
import { PAD_POPOVER_ATTR, PAD_STOP_ATTR } from "@/client/input/pad-nav";
import { useAppContext } from "@/client/hud/app/context";
import { nanoid } from "nanoid";
import { useMemo } from "react";
import type { Quest as QuestData } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import { QuestActions } from "./quest-actions";

/** A quest in the game's menus: the shared quest slot, with the buttons to accept or turn it in. */
export const Quest = ({ quest, parent = "keeper" }: { quest: QuestData; parent?: string }) => {
  const { hero, currentTooltipId, setCurrentTooltipId } = useAppContext();
  const playerQuest: PlayerQuestStatus | undefined = hero?.quests?.find(
    (q: PlayerQuestStatus) => q?.questId === quest?.id,
  );
  /* One tooltip open at a time across the HUD */
  const tooltipKey = useMemo(() => nanoid(), []);
  /* Only its own: a late hide mustn't close the quest the pointer has moved on to. */
  const close = () => setCurrentTooltipId((open) => (open === tooltipKey ? null : open));
  return (
    <QuestSlot
      quest={quest}
      playerQuest={playerQuest}
      player={hero}
      show={currentTooltipId === tooltipKey}
      onShow={() => setCurrentTooltipId(tooltipKey)}
      onHide={close}
      slotProps={{ [PAD_STOP_ATTR]: true }}
      /* Its buttons are reached with the controller from the quest */
      tooltipProps={{ [PAD_POPOVER_ATTR]: true }}
    >
      <QuestActions quest={quest} playerQuest={playerQuest} parent={parent} onClose={close} />
    </QuestSlot>
  );
};
