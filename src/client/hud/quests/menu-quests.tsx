import { Quest as QuestSlot } from "./quest";
import { Flex, Text, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { questList, type Quest, type QuestId } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { memo } from "react";
import type { CharacterMenuProps } from "@/client/hud/menu/menu-props";

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
