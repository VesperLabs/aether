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
  return (
    <Tooltip id={`${tooltipId}`} style={{ pointerEvents: "all" }} isOpen={show}>
      <Flex
        sx={{
          maxWidth: 200,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          "& strong": {
            color: playerQuest?.isReady ? "set" : "warning",
          },
        }}
      >
        <Text sx={{ fontWeight: "bold" }}>{quest?.name}</Text>
        <Divider />
        <Text dangerouslySetInnerHTML={{ __html: quest?.dialogues?.description }} />
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
  if (parent === "player") {
    //return <Button variant="wood">Abandon</Button>;
    return <></>;
  }
  if (playerQuest?.isCompleted) {
    return <></>;
  }
  if (playerQuest?.isReady) {
    return (
      <Button variant="wood" onClick={() => socket.emit("completeQuest", quest?.id)}>
        Turn In
      </Button>
    );
  }
  if (playerQuest) {
    return <Button variant="wood">In Progress</Button>;
  }
  return (
    <Button variant="wood" onClick={() => socket.emit("acceptQuest", quest?.id)}>
      Accept
    </Button>
  );
};

export default QuestTooltip;
