import type { Quest } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import type { ComponentProps } from "react";
import { ItemSlot, SlotAmount, STYLE_NON_EMPTY } from "@/ui/item";
import { Box, Flex, Icon, Text, TextDivider } from "@/ui/kit";
import { questDescription, questGiver } from "./quest-text";

/*
 * Gold and exp art is drawn at twice its size: clipped to its slot, and deaf to the pointer, or it
 * spills over the item reward beside it (and out of the tooltip onto the quests below) and takes
 * their hover.
 */
const REWARD_BOX = {
  position: "relative",
  overflow: "hidden",
  "& .icon": { pointerEvents: "none" },
} as const;

/** What a quest tooltip shows: its name and giver, what to do, and the rewards. */
export const QuestDetails = ({
  quest,
  playerQuest,
  player,
}: {
  quest: Quest;
  playerQuest?: PlayerQuestStatus;
  /** Whose requirements the reward items are coloured against. */
  player?: ComponentProps<typeof ItemSlot>["player"];
}) => {
  const { rewards } = quest ?? {};
  const done = playerQuest?.isCompleted || playerQuest?.isReady;
  return (
    <Flex
      sx={{
        maxWidth: 200,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        "& strong": { fontStyle: "normal", color: done ? "set" : "warning" },
      }}
    >
      <Text sx={{ fontWeight: "bold" }}>
        {playerQuest?.isCompleted && "🏆 "}
        {quest?.name}
        <Text sx={{ color: "gray.500" }}> ({questGiver(quest?.id)?.profile?.userName})</Text>
      </Text>
      <TextDivider />
      <Text dangerouslySetInnerHTML={{ __html: questDescription(quest, playerQuest) ?? "" }} />
      <TextDivider>Quest Rewards</TextDivider>
      <Flex sx={{ gap: 2 }}>
        {rewards?.items?.map((reward, idx) => (
          /* Its own location, so its tooltip's id is unique even when items share an id. */
          <ItemSlot
            player={player}
            item={reward}
            key={idx}
            location={`quest-${quest?.id}-${idx}`}
            disabled
          />
        ))}
        {(rewards?.gold as number) > 0 && (
          <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "unique" }), ...REWARD_BOX }}>
            <SlotAmount>{rewards?.gold}</SlotAmount>
            <Icon
              icon="./assets/icons/gold.png"
              sx={{ width: "106%", height: "106%", transform: "scale(2)" }}
            />
          </Box>
        )}
        {(rewards?.exp as number) > 0 && (
          <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "legendary" }), ...REWARD_BOX }}>
            <SlotAmount>{rewards?.exp}</SlotAmount>
            <Icon
              icon="./assets/icons/exp.png"
              sx={{ width: "100%", height: "100%", transform: "scale(2)" }}
            />
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
