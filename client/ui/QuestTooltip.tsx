import { Slot, SlotAmount, useAppContext } from "./";
import { Box, Text, Flex, Divider, Icon, Button, STYLE_NON_EMPTY } from "@aether/ui";
import ItemBuilder from "../../shared/ItemBuilder";
import nasties from "../../shared/data/nasties.json";
import keepers from "../../shared/data/keepers.json";
import Tooltip from "./Tooltip";

function getKeeperByQuestName(quest) {
  for (const key in keepers) {
    if (keepers?.[key]?.keeperData?.quests?.includes(quest)) {
      return keepers?.[key];
    }
  }
  return null; // Return null if the quest is not found
}

/* Formats and parses the quest information from dialoge templates */
const useQuestDialogue = (quest, playerQuest: PlayerQuest) => {
  const { dialogues, objectives } = quest ?? {};
  const objectiveTexts = objectives?.map((objective: QuestObjective, idx) => {
    let verb = "";
    let noun = null;
    let current = 0;
    let amount: string = "";

    if (objective?.type === "chat") {
      verb = "Talk to";
      const keeperName = keepers?.[objective?.keeper]?.profile?.userName;
      return `<strong>${verb} ${keeperName}</strong>`;
    }
    if (objective?.type === "item") {
      verb = "Collect";
      noun = ItemBuilder.buildItem(...objective.item)?.name;
      current = playerQuest?.objectives?.[idx]?.numCollected || 0;
    }
    if (objective?.type === "bounty") {
      verb = "Slay";
      noun = nasties?.[objective?.monster]?.profile?.userName;
      current = playerQuest?.objectives?.[idx]?.numKilled || 0;
    }

    if (playerQuest?.isCompleted || !playerQuest) {
      amount = `${objective?.amount}`;
    } else {
      amount = `(${Math.min(current, objective?.amount)}/${objective?.amount})`;
    }

    return `<strong>${verb} ${amount} ${noun}${
      objective?.amount > 1 && !noun.endsWith("s") ? "s" : ""
    }</strong>`;
  });

  const objText = objectiveTexts?.join(", ");

  return dialogues?.description?.replace("{objective}", objText);
};

const QuestTooltip = ({
  quest,
  playerQuest,
  show,
  tooltipId,
  onClose,
  parent,
  player,
}: {
  quest: Quest;
  tooltipId: string;
  show: boolean;
  onClose;
  playerQuest: PlayerQuest;
  parent: string;
  player: FullCharacterState;
}) => {
  const { socket } = useAppContext();
  const { rewards } = quest ?? {};
  const keeper = getKeeperByQuestName(quest?.id);
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
        <Divider />
        <Text dangerouslySetInnerHTML={{ __html: questDialogue }} />
        <Divider />
        <Text sx={{ fontWeight: "bold" }}>Quest Rewards</Text>
        <Divider />
        <Flex sx={{ gap: 2 }}>
          {rewards?.items?.map((reward: Item, idx: string) => {
            return <Slot player={player} item={reward} key={idx} disabled={true} />;
          })}
          {rewards?.gold > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "unique" }) }}>
              <SlotAmount>{rewards?.gold}</SlotAmount>
              <Icon
                icon="./assets/icons/gold.png"
                sx={{ width: "106%", height: "106%", transform: "scale(2)" }}
              />
            </Box>
          )}
          {rewards?.exp > 0 && (
            <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "legendary" }) }}>
              <SlotAmount>{rewards?.exp}</SlotAmount>
              <Icon
                icon="./assets/icons/exp.png"
                sx={{ width: "100%", height: "100%", transform: "scale(2)" }}
              />
            </Box>
          )}
        </Flex>
        <Divider />
        <Flex sx={{ gap: 1 }}>
          <Button
            variant="wood"
            onClick={(e) => {
              onClose(e);
            }}
          >
            Close
          </Button>
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

const QuestStatusButton = ({ playerQuest, quest, socket, parent, giverName }) => {
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

export default QuestTooltip;
