import { Button, Flex, Grid, Text } from "@/ui";
import { RowTitle } from "./row-title";
import { PlayerCard } from "./player-card";
import { PlayerPanel } from "./player-panel";
import { useState } from "react";
import { MENU_BUTTON } from "./menu-bar";
import { useLocation } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPlayers, type PlayersQueryKey } from "./api";
import type { FullCharacterWire } from "@/network";

/** A player or keeper as the wiki lists it: what the server sends, or a loading placeholder. */
export type WikiPlayer = Partial<FullCharacterWire> & {
  id: string;
  isGhost?: boolean;
  updatedAt?: string | number;
};

export function PagePlayers() {
  const [location] = useLocation();
  const [_, kind] = location?.split("/") ?? [];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["players", { kind, sortBy: "updatedAt" }] as PlayersQueryKey,
    queryFn: fetchPlayers,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage?.pageInfo?.nextPage;
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = players.find((player) => player.id === selectedId);
  /* The drawer's player, kept while it slides out after closing. */
  const [shown, setShown] = useState<WikiPlayer>();
  if (selected && selected !== shown) setShown(selected);

  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"social"}>Players</RowTitle>
      {/* Cards in a grid; the selected player's menus open in a drawer over the page. */}
      <Grid
        sx={{
          mt: 2,
          gap: 3,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          alignItems: "start",
        }}
      >
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={player.id === selected?.id}
            onSelect={() => setSelectedId(player.id === selectedId ? null : player.id)}
          />
        ))}
      </Grid>
      <LoadMore
        onClick={() => hasNextPage && fetchNextPage()}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
      {shown && (
        <PlayerPanel
          player={shown}
          closing={!selected}
          onClose={() => setSelectedId(null)}
          onClosed={() => setShown(undefined)}
        />
      )}
    </Flex>
  );
}

/** More players, under the grid, while there are more to load. */
const LoadMore = ({
  onClick,
  hasNextPage,
  isFetchingNextPage,
}: {
  onClick: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) =>
  hasNextPage ? (
    <Flex sx={{ justifyContent: "center", mt: 2 }}>
      <Button variant="menu" onClick={onClick} sx={{ ...MENU_BUTTON, px: 3 }}>
        <Text>{isFetchingNextPage ? "Loading…" : "Load more"}</Text>
      </Button>
    </Flex>
  ) : null;
