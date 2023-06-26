import { useState } from "react";
import { Box, Icon, BASE_SLOT_STYLE, SLOT_SIZE, QuestTooltip, useAppContext } from "./";
import { nanoid } from "nanoid";

const Quest = ({ quest, parent = "keeper" }: { quest: Quest; parent: string }) => {
  const { objectives } = quest ?? {};
  const { hero } = useAppContext();
  const [hovering, setHovering] = useState(false);
  const isBounty = objectives?.some((objective) => objective?.type === "bounty");
  const isItem = objectives?.some((objective) => objective?.type === "item");
  const playerQuest: PlayerQuest = hero?.quests?.find((q) => q?.questId === quest?.id);
  const tooltipId = nanoid();

  let icon = "./assets/icons/chest.png";
  if (isBounty) {
    icon = "./assets/icons/bounty.png";
  } else if (isItem) {
    icon = "./assets/icons/paper.png";
  }

  const handleMouseEnter = (e) => {
    setHovering(true);
  };

  const handleMouseLeave = (e) => {
    setHovering(false);
  };

  const outerMouseBinds = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  return (
    <Box sx={BASE_SLOT_STYLE} {...outerMouseBinds} onTouchStart={(e) => handleMouseEnter(e)}>
      <Box
        data-tooltip-id={`${tooltipId}`}
        sx={{
          position: "relative",
          overflow: hovering ? "visible" : "hidden",
          width: SLOT_SIZE,
          height: SLOT_SIZE,
        }}
      >
        <Icon icon={icon} sx={{ width: "100%", height: "100%", transform: "scale(2)" }} />
        <Box sx={{ position: "absolute", bottom: 1, right: 1 }}>
          {playerQuest?.isCompleted && "✅"}
        </Box>
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
