import {
  Box,
  Text,
  Flex,
  Divider,
  Slot,
  Icon,
  SlotAmount,
  STYLE_NON_EMPTY,
  Button,
  useAppContext,
  Tooltip,
} from "./";
import ItemBuilder from "../../server/ItemBuilder";
import nasties from "../../shared/data/nasties.json";
import keepers from "../../shared/data/keepers.json";

function getTopLevelKeyWithQuest(obj, quest) {
  for (const key in obj) {
    if (obj?.[key]?.keeperData?.quests?.includes(quest)) {
      return obj?.[key];
    }
  }
  return null; // Return null if the quest is not found
}

const useQuestDialogue = (quest, playerQuest: PlayerQuest) => {
  const { dialogues, objectives } = quest ?? {};
  const objectiveTexts = objectives?.map((objective: QuestObjective, idx) => {
    let verb = "";
    let noun = null;
    let current = 0;

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
    return `<strong>${verb} (${Math.min(current, objective?.amount)}/${
      objective?.amount
    }) ${noun}s</strong>`;
  });

  return dialogues?.description?.replace("{objective}", objectiveTexts?.[0]);
};

const QuestTooltip = ({
  quest,
  show,
  playerQuest,
  tooltipId,
  setShow,
  parent,
}: {
  quest: Quest;
  show: boolean;
  tooltipId: string;
  setShow;
  playerQuest: PlayerQuest;
  parent: string;
}) => {
  const { socket } = useAppContext();
  const { rewards } = quest ?? {};
  const questDialogue = useQuestDialogue(quest, playerQuest);
  const giverName = getTopLevelKeyWithQuest(keepers, quest?.id)?.profile?.userName;
  return (
    <Tooltip id={`${tooltipId}`} style={{ pointerEvents: "all" }} isOpen={show}>
      <Flex
        sx={{
          maxWidth: 200,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          "& strong": {
            fontStyle: "normal",
            color: playerQuest?.isReady ? "set" : "warning",
          },
        }}
      >
        <Text sx={{ fontWeight: "bold" }}>
          {quest?.name} for {giverName}
        </Text>
        <Divider />
        <Text dangerouslySetInnerHTML={{ __html: questDialogue }} />
        <Divider />
        <Text sx={{ fontWeight: "bold" }}>Quest Rewards</Text>
        <Divider />
        <Flex sx={{ gap: 2 }}>
          {rewards?.items?.map((reward: Item, idx: string) => {
            return <Slot item={reward} key={idx} disabled={true} />;
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
            <Box sx={{ ...STYLE_NON_EMPTY({ rarity: "set" }) }}>
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
          <Button variant="wood" onClick={() => setShow(false)}>
            Close
          </Button>
          <QuestStatusButton
            parent={parent}
            playerQuest={playerQuest}
            quest={quest}
            socket={socket}
          />
        </Flex>
      </Flex>
    </Tooltip>
  );
};

const QuestStatusButton = ({ playerQuest, quest, socket, parent }) => {
  if (playerQuest?.isCompleted) {
    return (
      <Button variant="wood" disabled>
        Complete
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
        Ready
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
