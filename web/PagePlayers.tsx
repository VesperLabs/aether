import { Box, Button, Flex, KeyboardKey, Text } from "@aether/ui";
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
import { useLocation, useParams } from "wouter";
import { useQuery } from "react-query";
import { fetchPlayers } from "./api";
import { uniqBy } from "lodash";

const MAX_ITEMS = 10;
const PLAYER_BOX_STYLES = {
  cursor: "pointer",
  borderRadius: 7,
  pb: 2,
};

export default function () {
  const [location, navigate] = useLocation();
  const params = useParams();
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const { bagState, toggleBagState } = useToggleBagState();
  const { tabs, setTabKey } = useSetTabs();
  const kind = location?.split("/")?.[1];
  const currentPage = parseInt(params?.page ?? 1);

  const { data: playerData, isLoading } = useQuery({
    queryKey: ["players", { kind, sortBy: "updatedAt", page: currentPage, limit: MAX_ITEMS }],
    queryFn: fetchPlayers,
    keepPreviousData: true,
  });

  const handleLoadMore = () => {
    navigate(`/${kind}/` + (currentPage + 1));
  };

  const handleClickItem = (e) => {
    const { id, base } = e.target.dataset ?? {};
    if (base === "bag") {
      toggleBagState(id);
    }
  };

  /* Load more functionality */
  useEffect(() => {
    if (playerData) {
      setPlayers((prev) => uniqBy([...prev, ...playerData], "id"));
    }
  }, [playerData]);

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

  const isPlayersPage = location === "/players";
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
                  ...PLAYER_BOX_STYLES,
                  position: "relative",
                  bg: isActive ? "shadow.20" : "transparent",
                }}
                key={idx}
                onClick={() => {
                  setCurrentPlayer(player);
                  setTabKey("stats", true);
                  isPlayersPage && setTabKey("inventory", true);
                  setTabKey("equipment", true);
                  setTabKey("abilities", true);
                }}
              >
                <PlayerRender player={player} onLoadComplete={(v) => console.log(v)} />
                <PlayerTooltip player={player} />
              </Box>
            );
          })}
          <LoadMore onClick={handleLoadMore} players={players} isLoading={isLoading} />
        </Flex>
      </Flex>
      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999999999,
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            overflowY: "auto",
            maxHeight: "100dvh",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            pointerEvents: ["all", "none", "none"],
            position: "relative",
          }}
        >
          <Flex
            sx={{
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              "& *": {
                pointerEvents: "all",
              },
            }}
          >
            <Box
              sx={{
                backgroundColor: ["#713f12", "shadow.30", "shadow.30"],
                backdropFilter: ["none", "blur(15px)", "blur(15px)"],
                borderRadius: "10px 10px 0 0",
                "& > div": { backgroundColor: "transparent" },
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
              <MenuBag
                player={currentPlayer}
                bagState={bagState}
                slotsEnabled={false}
                toggleBagState={toggleBagState}
              />
            </Box>
          </Flex>
        </Box>
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

const useSetTabs = () => {
  const [tabs, setTabs] = useState({
    equipment: false,
    inventory: false,
    stats: false,
    abilities: false,
  });
  const setTabKey = (key: string, value: boolean) => setTabs((prev) => ({ ...prev, [key]: value }));

  return { setTabKey, tabs };
};

const useToggleBagState = () => {
  const [bagState, setBagState] = useState([]);
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

  return { bagState, toggleBagState };
};

const LoadMore = ({ onClick, players, isLoading }) => {
  const show = isLoading || players?.length === MAX_ITEMS;
  return (
    <Box
      sx={{
        ...PLAYER_BOX_STYLES,
        opacity: show ? 0.5 : 0,
        "&:hover": { opacity: show ? 1 : 0 },
        transition: ".2s ease all",
      }}
      onClick={show ? onClick : () => {}}
    >
      <BlankPlayer userName="Load more..." />
    </Box>
  );
};

const BlankPlayer = ({ userName, sx, ...props }: any) => (
  <Box sx={{ "& canvas": { opacity: 0.15 }, ...sx }} {...props}>
    <PlayerRender
      player={{
        id: "xxx",
        profile: {
          tint: "0x000000",
          userName,
          gender: "male",
          race: "human",
          hair: {
            texture: "hair-3",
            tint: "0x000000",
          },
        },
      }}
    />
  </Box>
);

const PlayerTooltip = ({ player }) => {
  const completedQuests = player?.quests?.filter((q) => q?.isCompleted)?.length;
  const totalQuests = Object.keys(questList)?.length;
  const isKeeper = player?.kind === "keeper";
  return (
    <Tooltip id={player?.id} style={{ zIndex: 99999 }}>
      <Flex sx={TOOLTIP_STYLE}>
        {!isKeeper ? (
          <>
            <Text>
              <Label>Last Login:</Label> {new Date(player?.updatedAt)?.toLocaleDateString("en-US")}
            </Text>
            <Text>
              <Label>Completed Quests:</Label> {`${completedQuests} / ${totalQuests}`}
            </Text>
          </>
        ) : (
          <>
            <Text>
              <Label>Map:</Label> {player?.roomName}
            </Text>
          </>
        )}
      </Flex>
    </Tooltip>
  );
};
