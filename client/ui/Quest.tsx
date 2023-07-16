import { useEffect, useState } from "react";
import { Box, Icon } from "@aether/ui";
import { BASE_SLOT_STYLE, SLOT_SIZE, QuestTooltip, useAppContext } from "./";
import { nanoid } from "nanoid";
import { isMobile } from "../utils";

const Quest = ({ quest, parent = "keeper" }: { quest: Quest; parent: string }) => {
  const { objectives } = quest ?? {};
  const { hero } = useAppContext();
  const [hovering, setHovering] = useState(false);
  const isBounty = objectives?.some((objective) => objective?.type === "bounty");
  const isItem = objectives?.some((objective) => objective?.type === "item");
  const isChat = objectives?.some((objective) => objective?.type === "chat");
  const playerQuest: PlayerQuest = hero?.quests?.find((q) => q?.questId === quest?.id);
  const tooltipId = nanoid();

  let icon = "./assets/icons/chest.png";
  if (isBounty) {
    icon = "./assets/icons/bounty.png";
  } else if (isItem) {
    icon = "./assets/icons/paper.png";
  } else if (isChat) {
    icon = "./assets/icons/letter.png";
  }

  const handleMouseEnter = (e) => {
    setHovering(true);
  };

  const handleMouseLeave = (e) => {
    setHovering(false);
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

  useEffect(() => {
    document.addEventListener("touchstart", handleMouseLeave, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleMouseLeave);
    };
  }, []);

  return (
    <Box sx={BASE_SLOT_STYLE} {...outerMouseBinds} onTouchStart={(e) => handleMouseEnter(e)}>
      <Box
        data-tooltip-id={`${tooltipId}`}
        sx={{
          position: "relative",
          overflow: hovering ? "visible" : "hidden",
          width: SLOT_SIZE,
          height: SLOT_SIZE,
          filter: isCompleted ? `grayScale(100%)` : "none",
        }}
      >
        <Icon icon={icon} sx={{ width: "100%", height: "100%", transform: "scale(2)" }} />
        <Box sx={{ position: "absolute", bottom: 1, right: 1 }}>{getQuestEmoji()}</Box>
      </Box>
      <QuestTooltip
        parent={parent}
        tooltipId={tooltipId}
        quest={quest}
        show={hovering}
        setShow={setHovering}
        playerQuest={playerQuest}
      />
    </Box>
  );
};

export default Quest;
