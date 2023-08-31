import { Menu, MenuHeader, Quest, MENU_MAX_WIDTH } from "./";
import { Flex, Text } from "@aether/ui";
import { arePropsEqualWithKeys, questList } from "@aether/shared";
import { memo } from "react";

const MenuQuests = memo(({ player, isOpen, setIsOpen }: any) => {
  const playerQuests = player?.quests || [];
  const quests = playerQuests
    ?.filter((q) => !q?.isCompleted)
    .map((q: PlayerQuest) => ({
      id: q?.questId,
      ...questList?.[q?.questId],
      rewards: q?.rewards,
    })) as Quest[];

  return (
    <Menu
      sx={{
        display: isOpen ? "flex" : "none",
        alignItems: "end",
        flexDirection: "column",
      }}
    >
      <MenuHeader icon={`./assets/icons/quests.png`} onClick={() => setIsOpen(false)}>
        Quests
      </MenuHeader>
      <Flex
        sx={{
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "end",
          maxWidth: MENU_MAX_WIDTH,
        }}
      >
        {quests?.length === 0 && <Text>You are not on any quests.</Text>}
        {quests?.map((quest, idx) => {
          return <Quest key={idx} quest={quest} parent="player" />;
        })}
      </Flex>
    </Menu>
  );
}, arePropsEqualWithKeys(["isOpen", "player.quests", "currentTooltipId"]));

export default MenuQuests;
