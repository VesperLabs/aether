import {
  itemList,
  questList,
  resolveAsset,
  type ActorDefinition,
  type BuiltItem,
  type QuestId,
} from "@/content";
import { Box, Flex, ItemTooltip, Text } from "@/ui";
import { useId, useState } from "react";
import {
  CARD_COLORS,
  CharacterFace,
  MobFace,
  SpriteFace,
  keeperCharacter,
  raceAsset,
} from "./card-pool";
import { TALKING_ACTORS } from "./actor-groups";
import { WalkOnHover } from "./walk-on-hover";
import { Divider, PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import { DottedLine } from "./leader";
import { RowTitle } from "./row-title";
import { useHashScroll } from "./use-hash-scroll";

type ListedItem = { name?: string; texture?: string; slot?: string; tint?: string; cost?: number };
const listedItems = itemList as unknown as Record<
  string,
  Record<string, Record<string, ListedItem>>
>;

/** Built once per keeper, so the character renderer doesn't redraw on every render. */
const KEEPERS = TALKING_ACTORS.map(([key, keeper]) => ({
  key,
  keeper,
  character: keeper.profile.race === "human" ? keeperCharacter(keeper) : undefined,
})).sort((a, b) => (a.keeper.baseStats?.level ?? 0) - (b.keeper.baseStats?.level ?? 0));

export function PageKeepers() {
  useHashScroll();
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"pouch"}>Keepers</RowTitle>
      {/* Masonry: cards keep their own height and stack down three columns. */}
      <Box sx={{ mt: 2, columnCount: [1, 2, 3], columnGap: 3 }}>
        {KEEPERS.map(({ key, keeper, character }) => (
          <Box
            key={key}
            id={key}
            sx={{ breakInside: "avoid", mb: 3, display: "inline-block", width: "100%" }}
          >
            <KeeperCard keeper={keeper} character={character} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}

const KeeperCard = ({
  keeper,
  character,
}: {
  keeper: ActorDefinition;
  character: ReturnType<typeof keeperCharacter> | undefined;
}) => {
  const { quests = [], shop = [], home } = keeper;
  const asset = character ? undefined : raceAsset(keeper.profile.race);
  return (
    <WalkOnHover sx={{ ...PAPER_STYLE, p: 4 }}>
      <PaperFrame />
      {/* A wide gap, so weapons held out to the side don't run into the name. */}
      <Flex sx={{ gap: 4, alignItems: "center" }}>
        <Flex
          sx={{
            width: 64,
            height: 64,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {character && <CharacterFace character={character} />}
          {asset && <MobFace asset={asset} tint={keeper.profile.tint} size={64} shadow />}
        </Flex>
        <Box sx={{ minWidth: 0 }}>
          <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0 }}>
            {keeper.profile.userName}
          </Text>
          <Text as="p" sx={{ color: CARD_COLORS.keeper, fontSize: 1, fontWeight: 600, m: 0 }}>
            Level {keeper.baseStats?.level ?? 1} {keeper.charClass}
          </Text>
        </Box>
      </Flex>
      <Text
        as="p"
        sx={{
          color: PAPER.muted,
          fontSize: 1,
          lineHeight: 1.5,
          m: 0,
          mt: 4,
          minHeight: "3em",
          fontStyle: "italic",
        }}
      >
        {keeper.flavor}
      </Text>
      {quests.length > 0 && (
        <>
          <Divider label="Quests" />
          {quests.map((id) => (
            <QuestRow key={id} id={id} />
          ))}
        </>
      )}
      {shop.length > 0 && (
        <>
          <Divider label="Shop" />
          <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
            {shop.map(({ item: [type, rarity, key] }) => (
              <ShopItem
                key={`${type}-${rarity}-${key}`}
                type={type}
                rarity={rarity}
                itemKey={key}
              />
            ))}
          </Flex>
        </>
      )}
      {home && (
        <>
          <Divider />
          <Text sx={{ display: "block", fontSize: 1, color: PAPER.muted, textAlign: "center" }}>
            Can set your respawn point here
          </Text>
        </>
      )}
    </WalkOnHover>
  );
};

/** A quest's name joined to its level by a dotted leader, like the monsters' drops. */
const QuestRow = ({ id }: { id: QuestId }) => {
  const quest = questList[id];
  return (
    <Flex sx={{ fontSize: 1, py: "2px" }}>
      <DottedLine
        label={<Text sx={{ fontWeight: 600 }}>{quest.name}</Text>}
        value={<Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>Lv {quest.level}</Text>}
      />
    </Flex>
  );
};

/** One item for sale: just its sprite, with the game's item tooltip on hover. */
const ShopItem = ({ type, rarity, itemKey }: { type: string; rarity: string; itemKey: string }) => {
  const [hovering, setHovering] = useState(false);
  const tooltipId = useId();
  const item = listedItems[type]?.[rarity]?.[itemKey];
  const asset = item && resolveAsset(item, { profile: { race: "human", gender: "female" } });
  if (!item || !asset) return null;
  return (
    <Flex
      data-tooltip-id={tooltipId}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", cursor: "help" }}
    >
      <SpriteFace asset={asset} tint={item.tint} size={32} pixelScale={1} />
      <ItemTooltip
        item={{ ...item, key: itemKey, rarity, type } as BuiltItem}
        show={hovering}
        tooltipId={tooltipId}
      />
    </Flex>
  );
};
