import { Box, Icon, BASE_SLOT_STYLE, SLOT_SIZE } from "@/ui";
import { QuestTooltip } from "./quest-tooltip";
import { useAppContext } from "@/client/hud/app/context";
import { nanoid } from "nanoid";
import { isMobile } from "@/ui";
import { useMemo } from "react";
import type { Quest as QuestData } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";

export const Quest = ({ quest, parent = "keeper" }: { quest: QuestData; parent?: string }) => {
  const { objectives } = quest ?? {};
  const { hero, currentTooltipId, setCurrentTooltipId } = useAppContext();
  const isBounty = objectives?.some((objective) => objective?.type === "bounty");
  const isItem = objectives?.some((objective) => objective?.type === "item");
  const isChat = objectives?.some((objective) => objective?.type === "chat");
  const playerQuest: PlayerQuestStatus | undefined = hero?.quests?.find(
    (q: PlayerQuestStatus) => q?.questId === quest?.id,
  );
  const TOOLTIP_ID = useMemo(() => nanoid(), []);

  let icon = "./assets/icons/chest.png";
  if (isBounty) {
    icon = "./assets/icons/bounty.png";
  } else if (isItem) {
    icon = "./assets/icons/paper.png";
  } else if (isChat) {
    icon = "./assets/icons/letter.png";
  }

  const handleMouseEnter = () => {
    setCurrentTooltipId(TOOLTIP_ID);
  };

  const handleMouseLeave = () => {
    setCurrentTooltipId(null);
  };

  const outerMouseBinds = isMobile
    ? {
        onTouchEnd: handleMouseEnter,
      }
    : {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      };

  const isReady = playerQuest?.isReady && !playerQuest?.isCompleted;
  const isCompleted = playerQuest?.isCompleted;

  const getQuestEmoji = () => {
    if (isCompleted) return "🏆";
    if (isReady) return "✅";
    if (playerQuest) return "⏰";
  };

  const show = currentTooltipId === TOOLTIP_ID;

  return (
    <Box sx={BASE_SLOT_STYLE} {...outerMouseBinds} onTouchStart={() => handleMouseEnter()}>
      <Box
        data-tooltip-id={TOOLTIP_ID}
        sx={{
          position: "relative",
          overflow: show ? "visible" : "hidden",
          width: SLOT_SIZE,
          height: SLOT_SIZE,
          filter: isCompleted ? `grayScale(100%)` : "none",
        }}
      >
        <Icon icon={icon} sx={{ width: "100%", height: "100%", transform: "scale(2)" }} />
        <Box sx={{ position: "absolute", bottom: 1, right: 1 }}>{getQuestEmoji()}</Box>
      </Box>
      <QuestTooltip
        player={hero}
        parent={parent}
        tooltipId={TOOLTIP_ID}
        quest={quest}
        show={show}
        onClose={handleMouseLeave}
        playerQuest={playerQuest}
      />
    </Box>
  );
};
