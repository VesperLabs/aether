import { resolveAsset, type ItemDefinition } from "@/content";
import { describeItem, type DescribableItem, type StatLine } from "@/rules/inventory";
import { Box, Flex, Grid, Icon, Text } from "@/ui";
import type { ReactNode } from "react";
import { CARD_COLORS, SpriteFace, raceAsset } from "./card-pool";
import { itemSources } from "./item-sources";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";

/** An item as the wiki lists it: its definition, plus where it sits in the item list. */
export type WikiItem = ItemDefinition & { key: string; type: string; rarity: string };

/** `earthResistance` as "Earth resistance". */
const words = (key: string) => {
  const spaced = key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/** The game's "2 ↔ 3" ranges as "2–3". */
const range = (value: string) => value.replace(/\s*↔\s*/g, "–");

const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * One item as a paper row: who it is, what it does, what it needs and where to get it, side by
 * side so rows stay as short as their busiest column. On phones the columns stack.
 */
export const ItemCard = ({ item }: { item: WikiItem }) => {
  /* Content definitions are deeply readonly; the describer only reads them. */
  const described = describeItem(item as unknown as DescribableItem);
  const sources = itemSources(item.type, item.rarity, item.key);
  const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
  const color = CARD_COLORS[item.rarity] ?? CARD_COLORS.common;
  const lines = [...described.stats, ...described.effects];
  const charClass = item.requirements?.charClass;
  const category =
    item.type === "spell"
      ? `${capitalize(String(charClass ?? ""))} spell`
      : `${capitalize(item.rarity)} ${item.type}`;

  return (
    <Grid
      sx={{
        ...PAPER_STYLE,
        p: 4,
        columnGap: 4,
        rowGap: 3,
        gridTemplateColumns: ["1fr", "1fr 1fr", "minmax(220px, 1.3fr) 1.2fr 0.8fr 1.1fr"],
        alignItems: "start",
      }}
    >
      <PaperFrame />
      <Flex sx={{ gap: 3, alignItems: "flex-start", minWidth: 0 }}>
        <Flex
          sx={{
            width: 64,
            height: 64,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Every item at the same 2× scale, so their real sizes compare. */}
          {asset && <SpriteFace asset={asset} tint={item.tint} size={64} pixelScale={2} />}
        </Flex>
        <Box sx={{ minWidth: 0 }}>
          <Text as="h3" sx={{ fontSize: 3, fontWeight: 700, m: 0, color }}>
            {described.title}
          </Text>
          <Text as="p" sx={{ fontSize: 0, color: PAPER.muted, m: 0, mb: 1 }}>
            {category} · item level {item.ilvl}
          </Text>
          <Text
            as="p"
            sx={{ color: PAPER.muted, fontSize: 1, fontStyle: "italic", lineHeight: 1.4, m: 0 }}
          >
            {item.flavor}
          </Text>
        </Box>
      </Flex>
      <Column label="Stats">
        {lines.length ? <Lines lines={lines} /> : <None />}
        {described.set && (
          <Box sx={{ mt: 2 }}>
            <Text sx={{ display: "block", fontSize: 0, color: CARD_COLORS.set, fontWeight: 600 }}>
              {described.set.name} · all {described.set.pieces} pieces
            </Text>
            <Lines lines={described.set.stats} color={CARD_COLORS.set} />
          </Box>
        )}
      </Column>
      <Column label="Requires">
        {described.requirements.length ? <Lines lines={described.requirements} /> : <None />}
      </Column>
      <Column label="Where to find">
        <Sources sources={sources} cost={described.cost} />
      </Column>
    </Grid>
  );
};

/** A column with a small heading, so each one still reads when they stack on phones. */
const Column = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Text
      sx={{ display: "block", fontSize: 0, color: PAPER.muted, letterSpacing: "0.12em", mb: 1 }}
    >
      {label.toUpperCase()}
    </Text>
    {children}
  </Box>
);

const None = () => <Text sx={{ fontSize: 1, color: PAPER.muted }}>—</Text>;

/** Stat lines as a label and value joined by a dotted leader. */
const Lines = ({ lines, color }: { lines: StatLine[]; color?: string }) => (
  <Box sx={{ fontSize: 1 }}>
    {lines.map((line, i) => (
      <Flex key={`${line.label}-${i}`} sx={{ alignItems: "baseline", gap: 1 }}>
        <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>{words(line.label)}</Text>
        <Box sx={{ flex: 1, minWidth: 8, borderBottom: `1px dotted ${PAPER.ornament}` }} />
        <Text sx={{ fontWeight: 700, whiteSpace: "nowrap", color }}>{range(line.value)}</Text>
      </Flex>
    ))}
  </Box>
);

/** Monsters that drop the item, keepers that sell it and quests that give it, each with an icon. */
const Sources = ({ sources, cost }: { sources: ReturnType<typeof itemSources>; cost: number }) => {
  const rows: { label: string; value: string; color: string; icon: ReactNode }[] = [
    ...(sources?.drops ?? []).map((drop) => {
      const asset = raceAsset(drop.race);
      return {
        label: drop.name,
        value: `1 in ${drop.chance}`,
        color: CARD_COLORS.monster,
        icon: asset && <SpriteFace asset={asset} tint={drop.tint} size={32} />,
      };
    }),
    ...(sources?.sellers ?? []).map((name) => ({
      label: name,
      value: "Shop",
      color: CARD_COLORS.keeper,
      icon: <Icon icon="./assets/icons/pouch.png" size={32} />,
    })),
    ...(sources?.quests ?? []).map((name) => ({
      label: name,
      value: "Quest",
      color: CARD_COLORS.unique,
      icon: <Icon icon="./assets/icons/quests.png" size={32} />,
    })),
  ];
  if (!rows.length) {
    rows.push({
      label: "World drop",
      value: "Random",
      color: PAPER.muted,
      icon: <Icon icon="./assets/icons/chest.png" size={32} />,
    });
  }
  /* What it sells for, lined up with the sources as the last row. */
  if (cost > 0) {
    rows.push({
      label: "Value",
      value: `${cost} gold`,
      color: PAPER.ink,
      icon: <Icon icon="./assets/icons/gold.png" size={32} />,
    });
  }
  return (
    <Box sx={{ fontSize: 1 }}>
      {rows.map((row, i) => (
        <Flex key={`${row.label}-${i}`} sx={{ alignItems: "center", gap: 1 }}>
          <Flex
            sx={{
              width: 24,
              height: 24,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {row.icon}
          </Flex>
          <Text sx={{ color: row.color, fontWeight: 600, whiteSpace: "nowrap" }}>{row.label}</Text>
          <Box sx={{ flex: 1, minWidth: 8, borderBottom: `1px dotted ${PAPER.ornament}`, mt: 2 }} />
          <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>{row.value}</Text>
        </Flex>
      ))}
    </Box>
  );
};
