import { Quest as QuestSlot } from "./quest";
import { Flex, Text } from "theme-ui";
import { MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui/kit/menu";
import { questList, QuestId } from "@/content/quests/quest-list";
import { type Quest } from "@/content/quests/quest";
import type { PlayerQuestStatus } from "@/rules/quests";
import { arePropsEqualWithKeys } from "@/ui/kit/are-props-equal";
import { memo } from "react";
import type { CharacterMenuProps } from "@/ui/character/menu-props";

export const MenuQuests = memo(
  ({ player, isOpen, setIsOpen }: CharacterMenuProps) => {
    const playerQuests = player?.quests || [];
    const quests = playerQuests
      ?.filter((q) => !q?.isCompleted)
      .map((q: PlayerQuestStatus & { rewards?: Quest["rewards"] }) => ({
        id: q?.questId,
        ...questList?.[q?.questId as QuestId],
        rewards: q?.rewards,
        // The definition's objectives and rewards are the unbuilt form of a `Quest`'s.
      })) as unknown as Quest[];

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
            return <QuestSlot key={idx} quest={quest} parent="player" />;
          })}
        </Flex>
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "player.quests", "currentTooltipId"]),
);
