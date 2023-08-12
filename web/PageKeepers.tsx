import { Box, Flex, Text } from "@aether/ui";
import RowTitle from "./RowTitle";
import PlayerRender from "./PlayerRender";
import { useEffect, useState } from "react";
import { TOOLTIP_STYLE, Label } from "./";
import { Tooltip } from "react-tooltip";
import { questList } from "@aether/shared";

export default function () {
  const [keepers, setKeepers] = useState([]);
  useEffect(() => {
    fetch(`${process.env.SERVER_URL}/keepers/all`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setKeepers(data);
      })
      .catch((error) => {});
  }, []);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"social"}>Players</RowTitle>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        {keepers?.map((keeper, idx) => {
          return (
            <Box key={idx}>
              <PlayerRender player={keeper} />
              <KeeperTooltip keeper={keeper} />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

const KeeperTooltip = ({ keeper }) => {
  return (
    <Tooltip id={keeper?.id} style={{ zIndex: 99999 }}>
      <Flex sx={TOOLTIP_STYLE}>
        <Text>
          <Label>Map:</Label> {keeper?.roomName}
        </Text>
      </Flex>
    </Tooltip>
  );
};
