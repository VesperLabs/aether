import { Box, Flex, KeyboardKey, Text } from "@/ui";
import { RowTitle } from "./row-title";
import { useEffect, useState } from "react";
import { PlayerRender } from "./player-render";
import { TOOLTIP_STYLE, Label } from ".";
import { Tooltip } from "react-tooltip";
import { questList } from "@/shared/content";
import { MenuAbilities, MenuBag, MenuEquipment, MenuInventory, MenuStats } from "@/client";
import { useLocation } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPlayers, type PlayersQueryKey } from "./api";
import type { HudCharacter } from "@/client/hud/app/context";
import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";

/** A player or keeper as the wiki lists it: what the server sends, or a loading placeholder. */
export type WikiPlayer = Partial<HudCharacter> & {
  id: string;
  isGhost?: boolean;
  updatedAt?: string | number;
};

type TabKey = "equipment" | "inventory" | "stats" | "abilities";

const PLAYER_BOX_STYLES = {
  cursor: "pointer",
  borderRadius: 7,
  pb: 2,
};

export function PagePlayers() {
  const [location] = useLocation();
  const [currentPlayer, setCurrentPlayer] = useState<WikiPlayer | null>(null);
  const { bagState, toggleBagState } = useToggleBagState();
  const { tabs, setTabKey } = useSetTabs();
  const [_, kind] = location?.split("/") ?? [];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["players", { kind, sortBy: "updatedAt" }] as PlayersQueryKey,
    queryFn: fetchPlayers,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage?.pageInfo?.nextPage;
    },
  });

  const players: WikiPlayer[] = data?.pages
    ? data.pages.flatMap((p) => p?.data as WikiPlayer[])
    : [...new Array(3)]?.map((a, idx) => {
        return {
          id: `player-${idx}`,
          isGhost: true,
          profile: {
            userName: "Loading...",
            gender: "male",
            race: "human",
          },
        };
      });

  const handleLoadMore = () => {
    hasNextPage && fetchNextPage();
  };

  const handleClickItem = (e: MouseEvent) => {
    const { id, base } = (e.target as HTMLElement).dataset ?? {};
    if (base === "bag") {
      toggleBagState(id as string);
    }
  };

  /* If no tabs are open, clear player selection */
  useEffect(() => {
    if (Object.values(tabs)?.every((v) => !v) && bagState?.length === 0)
      return setCurrentPlayer(null);
  }, [tabs, bagState]);

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
                <PlayerRender player={player} />
                <PlayerTooltip player={player} />
              </Box>
            );
          })}
          <LoadMore
            onClick={handleLoadMore}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </Flex>
      </Flex>
      <MenuHolder>
        {[
          { Component: MenuEquipment, key: "equipment" },
          { Component: MenuInventory, key: "inventory" },
          { Component: MenuStats, key: "stats" },
          { Component: MenuAbilities, key: "abilities" },
        ].map(({ Component, key }) => (
          <Component
            key={key}
            player={currentPlayer}
            isOpen={tabs[key as TabKey]}
            slotsEnabled={false}
            setIsOpen={() => setTabKey(key as TabKey, false)}
          />
        ))}
        <MenuBag
          player={currentPlayer}
          bagState={bagState}
          slotsEnabled={false}
          toggleBagState={toggleBagState}
        />
      </MenuHolder>
      <KeyboardKey
        key={escCacheKey}
        name={"ESCAPE"}
        hidden={true}
        onKeyUp={() => {
          if (bagState?.length > 0) return toggleBagState(bagState?.[bagState?.length - 1]);
          for (const key of Object.keys(tabs) as TabKey[]) {
            if (tabs[key]) return setTabKey(key, false);
          }
        }}
      />
    </>
  );
}

const MenuHolder = ({ children }: { children?: ReactNode }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: "modal",
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
            {children}
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

const useSetTabs = () => {
  const [tabs, setTabs] = useState<Record<TabKey, boolean>>({
    equipment: false,
    inventory: false,
    stats: false,
    abilities: false,
  });
  const setTabKey = (key: TabKey, value: boolean) => setTabs((prev) => ({ ...prev, [key]: value }));

  return { setTabKey, tabs };
};

const useToggleBagState = () => {
  const [bagState, setBagState] = useState<string[]>([]);
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

const LoadMore = ({
  onClick,
  hasNextPage,
  isFetchingNextPage,
}: {
  onClick: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const show = hasNextPage;
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
      <BlankPlayer userName={isFetchingNextPage ? "Loading..." : "Load more ➜"} />
    </Box>
  );
};

const BlankPlayer = ({ userName, sx }: { userName: string; sx?: ThemeUIStyleObject }) => (
  <Box sx={{ "& canvas": { opacity: 0.15 }, ...sx }}>
    <PlayerRender
      player={{
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

const PlayerTooltip = ({ player }: { player: WikiPlayer }) => {
  const completedQuests = player?.quests?.filter(
    (q: { isCompleted?: boolean }) => q?.isCompleted,
  )?.length;
  const totalQuests = Object.keys(questList)?.length;
  const isKeeper = player?.kind === "keeper";
  return (
    <Tooltip id={player?.id} style={{ zIndex: 99999 }}>
      <Flex sx={TOOLTIP_STYLE}>
        {!isKeeper ? (
          <>
            <Text>
              <Label>Last Login:</Label>{" "}
              {new Date(player?.updatedAt ?? NaN)?.toLocaleDateString("en-US")}
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
