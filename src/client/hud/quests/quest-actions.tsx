import { useAppContext } from "@/client/hud/app/context";
import { Button, Flex, TextDivider, isMobile, questGiver } from "@/ui";
import type { Quest as QuestData } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import type { ClientGameSocket } from "@/network";

/** Under a quest's details in the game: Close on a touch screen, and accept, turn in or status. */
export const QuestActions = ({
  quest,
  playerQuest,
  parent,
  onClose,
}: {
  quest: QuestData;
  playerQuest: PlayerQuestStatus | undefined;
  parent: string;
  onClose: () => void;
}) => {
  const { socket } = useAppContext();
  const giverName = questGiver(quest?.id)?.profile?.userName;
  return (
    <>
      <TextDivider />
      <Flex sx={{ gap: 1 }}>
        {/* Only a touch screen needs Close: a mouse moves off the quest, and so does a controller. */}
        {isMobile && (
          <Button variant="wood" onClick={onClose}>
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
    </>
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
