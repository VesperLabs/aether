import {
  findDefinition,
  assetList,
  itemList,
  resolveAsset,
  type AssetDefinition,
  type BuiltItem,
  type ItemDefinition,
} from "@/content";
import {
  assetToCanvas,
  Box,
  deriveElements,
  ElementalItemArt,
  PlayerRender,
  WalkingSprite,
  previewSize,
  theme,
} from "@/ui";
import { ACTORS } from "./actor-parts";
import { useQuery } from "@tanstack/react-query";
import {
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { fetchPlayers, type PlayersQueryKey } from "./api";
import type { WikiPlayer } from "./page-players";
import { useWalkOnHover } from "./walk-on-hover";

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

/** A shade of a colour family from the game's palette, the same one its rarity colours come from. */
const shade = (family: string, step: number) =>
  (theme.colors as unknown as Record<string, Record<number, string>>)[family][step];

/**
 * Category colours, readable on paper: item rarities are deeper shades of the game's rarity
 * colours (orange, purple, lime, blue), and each kind of character has its own. Common is the
 * game's white, so it takes the ink colour.
 */
export const CARD_COLORS: Record<string, string> = {
  common: "#6b5a48",
  magic: shade("blue", 600),
  rare: shade("purple", 700),
  unique: shade("orange", 700),
  set: shade("lime", 700),
  character: "#0f766e",
  drop: "#b91c1c",
  shop: "#0f766e",
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
  elements = [],
}: {
  asset: AssetDefinition;
  tint?: string;
  size?: number;
  /** Draw at this exact scale instead of filling `size`, so sprites in a list share one pixel size. */
  pixelScale?: number;
  /** A weapon's elements: drawn with the same moving outline and particles as in the game. */
  elements?: string[];
}) => {
  const [imageData, setImageData] = useState<string>();
  const [natural, setNatural] = useState<{ width: number; height: number }>();
  /* Keyed on the art, not the asset object, which callers rebuild every render */
  const artKey = `${asset.src}|${asset.previewRect?.join(",")}`;
  useLayoutEffect(() => {
    return assetToCanvas({ asset, tint, setImageData });
  }, [artKey, tint]);

  /* Pixel art only stays even at whole-number scales: use the largest that fits the box. A sprite
     bigger than the box is shrunk smoothly instead, since crisp pixels would drop rows. */
  const fit = (art?: { width: number; height: number }) => {
    const longest = art ? Math.max(art.width, art.height) : size;
    const fitted = Math.floor(size / longest);
    return longest > size ? size / longest : Math.min(pixelScale ?? fitted, fitted);
  };
  const elementalScale = fit(previewSize(asset));
  if (elements.length > 0 && elementalScale >= 1)
    return (
      <ElementalItemArt asset={asset} tint={tint} elements={elements} scale={elementalScale} />
    );
  if (!imageData) return null;
  const scale = fit(natural);
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

/** A character that walks while its surrounding `WalkOnHover` is hovered. */
export const CharacterFace = ({
  character,
  sx = { width: 80, height: 80 },
}: {
  character: Character;
  sx?: ComponentProps<typeof PlayerRender>["sx"];
}) => <PlayerRender player={character} sx={sx} walking={useWalkOnHover()} shadow />;

/** A mob's whole sheet, walking while its surrounding `WalkOnHover` is hovered. */
export const MobFace = (props: {
  asset: AssetDefinition;
  tint?: string;
  size?: number;
  shadow?: boolean;
}) => <WalkingSprite {...props} walking={useWalkOnHover()} />;

/** The sprite sheet for a mob race. */
export const raceAsset = (race?: string) => assetList.find((a) => a?.texture === race);

/** Every actor, drawn in its gear if it's human, else as its race's sheet. */
const CHARACTER_CARDS: FeaturedCard[] = ACTORS.flatMap(([key, actor]) => {
  const asset = actor.profile.race === "human" ? undefined : raceAsset(actor.profile.race);
  /* Built once: a new object each render would make the renderer redraw (and flicker). */
  const character = asset ? undefined : keeperCharacter(actor);
  if (!asset && actor.profile.race !== "human") return [];
  return [
    {
      id: `character-${key}`,
      title: actor.profile.userName,
      category: `Level ${actor.baseStats.level} ${actor.charClass}`,
      color: CARD_COLORS.character,
      info: actor.flavor,
      href: `/characters#${key}`,
      art: () =>
        asset ? (
          <MobFace asset={asset} tint={actor.profile.tint} shadow />
        ) : (
          <CharacterFace character={character} />
        ),
    },
  ];
});

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
              href: `/items#${type}-${rarity}-${key}`,
              color: CARD_COLORS[rarity] ?? CARD_COLORS.common,
              art: () => (
                <SpriteFace
                  asset={asset}
                  tint={item.tint}
                  size={ITEM_SIZE}
                  elements={type === "weapon" ? deriveElements(item.stats) : []}
                />
              ),
            },
          ];
        }),
      ),
);

/** A keeper's equipment refs (`[type, rarity, key]`) turned into the items the renderer draws. */
export function keeperCharacter(keeper: { profile: object; equipment?: object }): Character {
  const equipment = Object.fromEntries(
    Object.entries(keeper.equipment ?? {}).map(([slot, ref]) => {
      const [type, rarity, key] = (ref ?? []) as string[];
      return [slot, ref ? (findDefinition(type, rarity, key).item as BuiltItem) : null];
    }),
  );
  return {
    profile: keeper.profile as NonNullable<Character>["profile"],
    equipment,
    /* The renderer only draws slots listed here. */
    activeItemSlots: Object.keys(equipment).filter((slot) => equipment[slot]),
  };
}

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
    href: `/players#${player.id}`,
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
  return useMemo(() => [...CHARACTER_CARDS, ...ITEM_CARDS, ...players.map(playerCard)], [players]);
}
