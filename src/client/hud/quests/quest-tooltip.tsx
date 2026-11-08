import { Slot } from "@/client/hud/inventory/slot";
import { SlotAmount } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { Box, Text, Flex, TextDivider, Icon, Button, STYLE_NON_EMPTY } from "@/ui";
import {
  ItemBuilder,
  PREVIEW_DICE,
  actors,
  type ActorDefinition,
  type ActorId,
  type Quest as QuestData,
  type QuestObjective,
} from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import type { ClientGameSocket } from "@/network";
import type { HudCharacter } from "@/client/hud/app/context";
import { Tooltip } from "@/ui";
import { PAD_POPOVER_ATTR } from "@/client/input/pad-nav";
import { getLastDevice, subscribeLastDevice } from "@/client/input/last-device";
import { useSyncExternalStore } from "react";

/** The actor who hands out `quest`, if any. */
function getQuestGiver(quest: string) {
  const all = Object.values(actors) as ActorDefinition[];
  return all.find((actor) => (actor.quests as readonly string[] | undefined)?.includes(quest));
}

/* Formats and parses the quest information from dialoge templates */
const useQuestDialogue = (quest: QuestData, playerQuest: PlayerQuestStatus | undefined) => {
  const { dialogues, objectives } = quest ?? {};
  const objectiveTexts = objectives?.map((objective: QuestObjective, idx: number) => {
    let verb = "";
    let noun: string | undefined;
    let current = 0;
    let amount: string = "";

    if (objective?.type === "chat") {
      verb = "Talk to";
      const keeperName = actors[objective?.keeper as ActorId]?.profile?.userName;
      return `<strong>${verb} ${keeperName}</strong>`;
    }
    if (objective?.type === "item") {
      verb = "Collect";
      noun = ItemBuilder.buildItem(
        PREVIEW_DICE,
        ...(objective.item as [string, string, string]),
      )?.name;
      current = playerQuest?.objectives?.[idx]?.numCollected || 0;
    }
    if (objective?.type === "bounty") {
      verb = "Slay";
      noun = actors[objective?.monster as ActorId]?.profile?.userName;
      current = playerQuest?.objectives?.[idx]?.numKilled || 0;
    }

    if (playerQuest?.isCompleted || !playerQuest) {
      amount = `${objective?.amount}`;
    } else {
      amount = `(${Math.min(current, objective?.amount as number)}/${objective?.amount})`;
    }

    return `<strong>${verb} ${amount} ${noun}${
      (objective?.amount as number) > 1 && !(noun as string).endsWith("s") ? "s" : ""
    }</strong>`;
  });

  const objText = objectiveTexts?.join(", ");

  return dialogues?.description?.replace("{objective}", objText);
};

export const QuestTooltip = ({
  quest,
  playerQuest,
  show,
  tooltipId,
  onClose,
  parent,
  player,
}: {
  quest: QuestData;
  tooltipId: string;
  show: boolean;
  onClose: () => void;
  playerQuest: PlayerQuestStatus | undefined;
  parent: string;
  player: HudCharacter;
}) => {
  const { socket } = useAppContext();
  /* A controller closes it by moving off the quest: Close would only be in the way */
  const onPad = useSyncExternalStore(subscribeLastDevice, getLastDevice) === "gamepad";
  const { rewards } = quest ?? {};
  const keeper = getQuestGiver(quest?.id);
  const questDialogue = useQuestDialogue(quest, playerQuest);
  const giverName = keeper?.profile?.userName;

  const getQuestColor = () => {
    if (playerQuest?.isCompleted) return "set";
    if (playerQuest?.isReady) return "set";
    return "warning";
  };

  return (
    <Tooltip id={tooltipId} style={{ pointerEvents: "all" }} isOpen={show}>
      <Flex
        /* Its buttons are reached with the controller from the quest */
        {...{ [PAD_POPOVER_ATTR]: true }}
        sx={{
          maxWidth: 200,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          "& strong": {
            fontStyle: "normal",
            color: getQuestColor(),
          },
        }}
      >
        <Text sx={{ fontWeight: "bold" }}>
          {playerQuest?.isCompleted && "🏆 "}
          {quest?.name}
          <Text sx={{ color: "gray.500" }}> ({giverName})</Text>
        </Text>
        <TextDivider />
        <Text dangerouslySetInnerHTML={{ __html: questDialogue }} />
        <TextDivider>Quest Rewards</TextDivider>
        <Flex sx={{ gap: 2 }}>
          {rewards?.items?.map((reward, idx) => {
            return <Slot player={player} item={reward} key={idx} disabled={true} />;
          })}
          {(rewards?.gold as number) > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "unique" }) }}>
              <SlotAmount>{rewards?.gold}</SlotAmount>
              <Icon
                icon="./assets/icons/gold.png"
                sx={{ width: "106%", height: "106%", transform: "scale(2)" }}
              />
            </Box>
          )}
          {(rewards?.exp as number) > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "legendary" }) }}>
              <SlotAmount>{rewards?.exp}</SlotAmount>
              <Icon
                icon="./assets/icons/exp.png"
                sx={{ width: "100%", height: "100%", transform: "scale(2)" }}
              />
            </Box>
          )}
        </Flex>
        <TextDivider />
        <Flex sx={{ gap: 1 }}>
          {!onPad && (
            <Button
              variant="wood"
              onClick={() => {
                onClose();
              }}
            >
              Close
            </Button>
          )}
          <QuestStatusButton
            parent={parent}
            playerQuest={playerQuest}
            quest={quest}
            socket={socket}
            giverName={giverName}
          />
        </Flex>
      </Flex>
    </Tooltip>
  );
};

const QuestStatusButton = ({
  playerQuest,
  quest,
  socket,
  parent,
  giverName,
}: {
  playerQuest: PlayerQuestStatus | undefined;
  quest: QuestData;
  socket: ClientGameSocket;
  parent: string;
  giverName: string | undefined;
}) => {
  if (playerQuest?.isCompleted) {
    return (
      <Button variant="wood" disabled>
        Done
      </Button>
    );
  }
  if (playerQuest?.isReady && parent === "keeper") {
    return (
      <Button variant="wood" onClick={() => socket.emit("completeQuest", quest?.id)}>
        Turn In
      </Button>
    );
  }
  if (playerQuest?.isReady && parent === "player") {
    return (
      <Button variant="wood" disabled>
        Return to {giverName}
      </Button>
    );
  }
  if (playerQuest) {
    return (
      <Button variant="wood" disabled>
        In Progress
      </Button>
    );
  }
  return (
    <Button variant="wood" onClick={() => socket.emit("acceptQuest", quest?.id)}>
      Accept
    </Button>
  );
};
