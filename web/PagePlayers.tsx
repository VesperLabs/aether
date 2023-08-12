import { Box, Flex, Text } from "@aether/ui";
import RowTitle from "./RowTitle";
import { useEffect, useState } from "react";
import PlayerRender from "./PlayerRender";
import { TOOLTIP_STYLE, Label } from "./";
import { Tooltip } from "react-tooltip";
import { questList } from "@aether/shared";

export default function () {
  const [players, setPlayers] = useState<Array<FullCharacterState>>();

  useEffect(() => {
    fetch(`${process.env.SERVER_URL}/players/all?sortBy=updatedAt`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setPlayers(data);
      })
      .catch((error) => {});
  }, []);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"social"}>Players</RowTitle>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        {players?.map((player, idx) => {
          return (
            <Box key={idx}>
              <PlayerRender player={player} />
              <PlayerTooltip player={player} />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

const PlayerTooltip = ({ player }) => {
  const completedQuests = player?.quests?.filter((q) => q?.isCompleted)?.length;
  const totalQuests = Object.keys(questList)?.length;
  return (
    <Tooltip id={player?.id} style={{ zIndex: 99999 }}>
      <Flex sx={TOOLTIP_STYLE}>
        <Text>
          <Label>Last Login:</Label> {new Date(player?.updatedAt)?.toLocaleDateString("en-US")}
        </Text>
        <Text>
          <Label>Completed Quests:</Label> {`${completedQuests} / ${totalQuests}`}
        </Text>
      </Flex>
    </Tooltip>
  );
};
