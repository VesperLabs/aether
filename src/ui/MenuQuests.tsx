import { Flex, useAppContext, MenuHeader, Quest } from "./";
import questList from "../../shared/data/questList.json";
const MenuQuests = () => {
  const { hero, tabQuests, setTabQuests } = useAppContext();
  const playerQuests = hero?.quests || [];
  const quests = playerQuests?.map((q: PlayerQuest) => ({
    id: q?.questId,
    ...questList?.[q?.questId],
    rewards: q?.rewards,
  })) as Quest[];
  return (
    <Flex
      sx={{
        flexDirection: "column",
        gap: 2,
        p: 2,
        bg: "shadow.30",
        pointerEvents: "all",
        display: tabQuests ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="quests" onClick={() => setTabQuests(false)}>
          Quests
        </MenuHeader>
        <Flex
          sx={{
            gap: 2,
            display: tabQuests ? "flex" : "none",
            justifySelf: "start",
          }}
        >
          {quests?.map((quest, idx) => {
            return <Quest key={idx} quest={quest} parent="player" />;
          })}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default MenuQuests;
