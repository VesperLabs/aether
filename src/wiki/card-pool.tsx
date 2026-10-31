import {
  assetList,
  itemList,
  keepers,
  nasties,
  resolveAsset,
  type AssetDefinition,
  type BuiltItem,
  type ItemDefinition,
} from "@/content";
import { assetToCanvas, Box, PlayerRender } from "@/ui";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
import { fetchPlayers, type PlayersQueryKey } from "./api";
import type { WikiPlayer } from "./page-players";

/** One thing from the game shown on a card: its art, name, category and a line or two about it. */
export type FeaturedCard = {
  id: string;
  title: string;
  category: string;
  info: string;
  href: string;
  /** The colour of the category line. */
  color: string;
  art: () => ReactNode;
};

/**
 * Category colours, readable on paper: item rarities are deeper versions of the game's rarity
 * colours, and each kind of character has its own.
 */
export const CARD_COLORS: Record<string, string> = {
  common: "#6b5a48",
  magic: "#2563eb",
  rare: "#7e22ce",
  unique: "#b45309",
  set: "#4d7c0f",
  monster: "#b91c1c",
  keeper: "#0f766e",
  player: "#1d4ed8",
};

/** Items are drawn smaller than creatures. */
const ITEM_SIZE = 52;

type Character = Parameters<typeof PlayerRender>[0]["player"];
type ListedItem = Partial<BuiltItem> & Pick<ItemDefinition, "flavor">;
const listedItems = itemList as unknown as Record<
  string,
  Record<string, Record<string, ListedItem>>
>;

const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);
const words = (key: string) => capitalize(key.replace(/([A-Z])/g, " $1").toLowerCase());

/** One sprite cut out of its texture and blown up with crisp pixels. */
export const SpriteFace = ({
  asset,
  tint,
  size = 80,
  pixelScale,
}: {
  asset: AssetDefinition;
  tint?: string;
  size?: number;
  /** Draw at this exact scale instead of filling `size`, so sprites in a list share one pixel size. */
  pixelScale?: number;
}) => {
  const [imageData, setImageData] = useState<string>();
  const [natural, setNatural] = useState<{ width: number; height: number }>();
  useLayoutEffect(() => {
    assetToCanvas({ asset, tint, setImageData });
  }, [asset, tint]);
  if (!imageData) return null;

  /* Pixel art only stays even at whole-number scales: use the largest that fits the box. A sprite
     bigger than the box is shrunk smoothly instead, since crisp pixels would drop rows. */
  const longest = natural ? Math.max(natural.width, natural.height) : size;
  const fitted = Math.floor(size / longest);
  const scale = longest > size ? size / longest : Math.min(pixelScale ?? fitted, fitted);
  return (
    <Box
      as="img"
      {...{ src: imageData, alt: "" }}
      onLoad={(event: SyntheticEvent<HTMLImageElement>) =>
        setNatural({
          width: event.currentTarget.naturalWidth,
          height: event.currentTarget.naturalHeight,
        })
      }
      sx={{
        display: "block",
        flexShrink: 0,
        width: natural ? natural.width * scale : size,
        height: natural ? natural.height * scale : size,
        objectFit: "contain",
        imageRendering: scale >= 1 ? "pixelated" : "auto",
        visibility: natural ? "visible" : "hidden",
      }}
    />
  );
};

export const CharacterFace = ({ character }: { character: Character }) => (
  <PlayerRender player={character} sx={{ width: 80, height: 80 }} />
);

/** The sprite sheet for a mob race. */
export const raceAsset = (race?: string) => assetList.find((a) => a?.texture === race);

type Mob = {
  profile: { race?: string; userName: string; tint?: string };
  baseStats: { level: number };
  flavor: string;
};

const MONSTER_CARDS: FeaturedCard[] = Object.entries(nasties as Record<string, Mob>).flatMap(
  ([key, mob]) => {
    const asset = raceAsset(mob.profile.race);
    if (!asset) return [];
    return [
      {
        id: `monster-${key}`,
        title: mob.profile.userName,
        category: `Level ${mob.baseStats.level} monster`,
        color: CARD_COLORS.monster,
        info: mob.flavor,
        href: "/monsters",
        art: () => <SpriteFace asset={asset} tint={mob.profile.tint} />,
      },
    ];
  },
);

const ITEM_CARDS: FeaturedCard[] = Object.entries(listedItems).flatMap(([type, byRarity]) =>
  type === "stackable"
    ? []
    : Object.entries(byRarity).flatMap(([rarity, byKey]) =>
        Object.entries(byKey).flatMap(([key, item]) => {
          const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
          if (!asset) return [];
          const charClass = (item.requirements as { charClass?: string } | undefined)?.charClass;
          return [
            {
              id: `item-${type}-${rarity}-${key}`,
              title: item.name ?? words(key),
              category:
                type === "spell"
                  ? `${capitalize(charClass)} spell`
                  : `${capitalize(rarity)} ${type}`,
              info: item.flavor ?? "",
              href: "/items",
              color: CARD_COLORS[rarity] ?? CARD_COLORS.common,
              art: () => <SpriteFace asset={asset} tint={item.tint} size={ITEM_SIZE} />,
            },
          ];
        }),
      ),
);

/** A keeper's equipment refs (`[type, rarity, key]`) turned into the items the renderer draws. */
export const keeperCharacter = (keeper: { profile: object; equipment?: object }): Character => {
  const equipment = Object.fromEntries(
    Object.entries(keeper.equipment ?? {}).map(([slot, ref]) => {
      const [type, rarity, key] = (ref ?? []) as string[];
      return [slot, ref ? (listedItems[type]?.[rarity]?.[key] as BuiltItem) : null];
    }),
  );
  return {
    profile: keeper.profile as NonNullable<Character>["profile"],
    equipment,
    /* The renderer only draws slots listed here. */
    activeItemSlots: Object.keys(equipment).filter((slot) => equipment[slot]),
  };
};

const KEEPER_CARDS: FeaturedCard[] = Object.entries(keepers).map(([key, keeper]) => {
  const asset = keeper.profile.race !== "human" ? raceAsset(keeper.profile.race) : undefined;
  const greet = (keeper as { keeperData?: { dialogues?: { greet?: string } } }).keeperData
    ?.dialogues?.greet;
  /* Built once: a new object each render would make the renderer redraw (and flicker). */
  const character = asset ? undefined : keeperCharacter(keeper);
  return {
    id: `keeper-${key}`,
    title: keeper.profile.userName,
    category: "Keeper",
    color: CARD_COLORS.keeper,
    info: (greet ?? "").replace(/<[^>]+>/g, ""),
    href: "/keepers",
    art: () => (asset ? <SpriteFace asset={asset} /> : <CharacterFace character={character} />),
  };
});

const playerCard = (player: WikiPlayer): FeaturedCard => {
  const worn = Object.values(player.equipment ?? {})
    .map((item) => (item as BuiltItem | null)?.name)
    .filter(Boolean);
  return {
    id: `player-${player.id}`,
    title: player.profile?.userName ?? "Adventurer",
    category: `Level ${player.stats?.level ?? 1} ${player.charClass ?? "player"}`,
    color: CARD_COLORS.player,
    info: worn.length ? `Wearing ${worn.join(", ")}` : "",
    href: "/players",
    art: () => <CharacterFace character={player as Character} />,
  };
};

/** Every monster, item, spell and keeper, plus the most recently active players. */
export function useCardPool() {
  const { data } = useQuery({
    queryKey: ["players", { kind: "players", sortBy: "updatedAt", limit: 12 }] as PlayersQueryKey,
    queryFn: fetchPlayers as never,
  });
  const players = ((data as { data?: WikiPlayer[] } | undefined)?.data ?? []).filter(Boolean);
  return useMemo(
    () => [...MONSTER_CARDS, ...ITEM_CARDS, ...KEEPER_CARDS, ...players.map(playerCard)],
    [players],
  );
}
