import { Box, Flex, KeyboardKey, Text } from "@aether/ui";
import RowTitle from "./RowTitle";
import { useEffect, useState } from "react";
import PlayerRender from "./PlayerRender";
import { TOOLTIP_STYLE, Label } from "./";
import { Tooltip } from "react-tooltip";
import { questList } from "@aether/shared";
import {
  MenuAbilities,
  MenuBag,
  MenuEquipment,
  MenuInventory,
  MenuQuests,
  MenuStats,
} from "@aether/client";

export default function () {
  const [players, setPlayers] = useState<Array<FullCharacterState>>();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [bagState, setBagState] = useState([]);
  const [tabs, setTabs] = useState({
    equipment: false,
    inventory: false,
    stats: false,
    abilities: false,
  });
  const escCacheKey = JSON.stringify(tabs);

  /* Is the bag open or closed */
  const toggleBagState = (id: string) => {
    setBagState((prev) => {
      if (prev.includes(id)) {
        // If id is already present, remove it from the array
        return prev.filter((itemId) => itemId !== id);
      } else {
        // If id is not present, add it to the array
        return [...prev, id];
      }
    });
  };

  const setTabKey = (key: string, value: boolean) => setTabs((prev) => ({ ...prev, [key]: value }));

  const handleClickItem = (e) => {
    const { id, base } = e.target.dataset ?? {};
    if (base === "bag") {
      toggleBagState(id);
    }
  };

  /* Fetch player data */
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

  /* If no tabs are open, clear player selection */
  useEffect(() => {
    if (Object.values(tabs)?.every((v) => !v)) return setCurrentPlayer(false);
  }, [tabs]);

  /* Detect clicks */
  useEffect(() => {
    document.addEventListener("click", handleClickItem);
    return () => {
      document.removeEventListener("click", handleClickItem);
    };
  }, []);

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
      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "100vh",
          width: "100%",
          zIndex: 999999999999,
          overflowY: "auto",
          pointerEvents: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Flex sx={{ flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-end" }}>
          <Box
            sx={{
              pointerEvents: "all",
              backdropFilter: "brightness(80%) blur(25px)",
              borderRadius: "10px 10px 0 0",
              "& > div": { backgroundColor: "transparent" },
            }}
          >
            <MenuBag
              player={currentPlayer}
              bagState={bagState}
              slotsEnabled={false}
              toggleBagState={toggleBagState}
            />
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
          </Box>
        </Flex>
      </Box>
      <KeyboardKey
        key={escCacheKey}
        name={"ESCAPE"}
        hidden={true}
        onKeyUp={() => {
          if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
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
