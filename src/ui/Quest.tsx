import { useState } from "react";
import { Box, Icon, BASE_SLOT_STYLE, SLOT_SIZE, QuestTooltip, useAppContext } from "./";

const Quest = ({ quest }: { quest: Quest }) => {
  const { objectives } = quest ?? {};
  const { game } = useAppContext();
  const scene = game?.scene?.getScene?.("SceneMain") as any;
  const hero: Character = scene?.hero;
  const [hovering, setHovering] = useState(false);
  const isBounty = objectives?.some((objective) => objective?.type === "bounty");
  const isItem = objectives?.some((objective) => objective?.type === "item");
  const playerQuest: PlayerQuest = hero.getPlayerQuestStatus(quest);

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
    <Box sx={BASE_SLOT_STYLE} {...outerMouseBinds}>
      <Box
        data-tooltip-id={`tooltip-quest-${quest?.id}`}
        sx={{
          position: "relative",
          overflow: hovering ? "visible" : "hidden",
          width: SLOT_SIZE,
          height: SLOT_SIZE,
        }}
      >
        <Icon icon={icon} sx={{ width: "100%", height: "100%", transform: "scale(2)" }} />
      </Box>
      <QuestTooltip quest={quest} show={hovering} setShow={setHovering} playerQuest={playerQuest} />
    </Box>
  );
};

export default Quest;
