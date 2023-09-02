import { Box, Flex, KeyboardKey, Text } from "@aether/ui";
import RowTitle from "./RowTitle";
import { useEffect, useState } from "react";
import PlayerRender from "./PlayerRender";
import { TOOLTIP_STYLE, Label } from "./";
import { Tooltip } from "react-tooltip";
import { questList } from "@aether/shared";
import { MenuAbilities, MenuEquipment, MenuInventory, MenuQuests, MenuStats } from "@aether/client";

export default function () {
  const [players, setPlayers] = useState<Array<FullCharacterState>>();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [tabs, setTabs] = useState({
    equipment: false,
    inventory: false,
    stats: false,
    abilities: false,
  });

  const setTabKey = (key: string, value: boolean) => setTabs((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (Object.values(tabs)?.every((v) => !v)) return setCurrentPlayer(false);
  }, [tabs]);

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

  const escCacheKey = JSON.stringify(tabs);

  return (
    <>
      <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
        <RowTitle icon={"social"}>Players</RowTitle>
        <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
          {players?.map((player, idx) => {
            const isActive = currentPlayer?.id === player?.id;
            return (
              <Box
                sx={{
                  bg: isActive ? "shadow.20" : "transparent",
                  cursor: "pointer",
                  borderRadius: 7,
                  pb: 2,
                }}
                key={idx}
                onClick={() => {
                  setCurrentPlayer(player);
                  setTabKey("stats", true);
                  setTabKey("inventory", true);
                  setTabKey("equipment", true);
                  setTabKey("abilities", true);
                }}
              >
                <PlayerRender player={player} />
                <PlayerTooltip player={player} />
              </Box>
            );
          })}
        </Flex>
      </Flex>
      <Flex
        sx={{
          backdropFilter: "blur(25px)",
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          "& > *": { flex: 1 },
          flexDirection: "column",
          zIndex: 12000,
        }}
      >
        {[
          { Component: MenuEquipment, key: "equipment" },
          { Component: MenuInventory, key: "inventory" },
          { Component: MenuStats, key: "stats" },
          { Component: MenuAbilities, key: "abilities" },
        ].map(({ Component, key }, idx) => (
          <Component
            key={key}
            player={currentPlayer}
            isOpen={tabs[key]}
            slotsEnabled={false}
            setIsOpen={() => setTabKey(key, false)}
          />
        ))}
      </Flex>
      <KeyboardKey
        key={escCacheKey}
        name={"ESCAPE"}
        hidden={true}
        onKeyUp={() => {
          for (const key of Object.keys(tabs)) {
            if (tabs[key]) return setTabKey(key, false);
          }
        }}
      />
    </>
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
