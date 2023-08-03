import { Box, Flex } from "@aether/ui";
import RowTitle from "./RowTitle";
import { useEffect, useState } from "react";
import PlayerRender from "./PlayerRender";

export default function () {
  const [players, setPlayers] = useState<Array<FullCharacterState>>();
  const [isLoading, setLoading] = useState<Boolean>(true);

  useEffect(() => {
    fetch(`${process.env.SERVER_URL}/players/all`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  }, []);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"social"}>Players</RowTitle>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        {players?.map((player, idx) => {
          return (
            <Box key={idx}>
              <PlayerRender player={player} />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}
