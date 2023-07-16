import { Menu, useAppContext, MenuHeader, Quest, MENU_MAX_WIDTH } from "./";
import { Flex, Text } from "@aether/ui";

import questList from "../../shared/data/questList.json";
const MenuQuests = () => {
  const { hero, tabQuests, setTabQuests } = useAppContext();
  const playerQuests = hero?.quests || [];
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
        display: tabQuests ? "flex" : "none",
        alignItems: "end",
        flexDirection: "column",
      }}
    >
      <MenuHeader icon={`../assets/icons/quests.png`} onClick={() => setTabQuests(false)}>
        Quests
      </MenuHeader>
      <Flex
        sx={{
          display: tabQuests ? "flex" : "none",
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
};

export default MenuQuests;
