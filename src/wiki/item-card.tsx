import { itemEffects, randomDropLevels, resolveAsset, type CatalogItem } from "@/content";
import {
  describeItem,
  type DescribableItem,
  type StatLine,
  type TriggerLine,
} from "@/rules/inventory";
import { Box, Flex, GearSlotIcons, Grid, Icon, RomanNumeral, Text, treeBranches } from "@/ui";
import type { ReactNode } from "react";
import { CARD_COLORS, SpriteFace } from "./card-pool";
import { itemSources } from "./item-sources";
import { Divider, PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import { ICON, NATIVE_ICON, Row } from "./card-row";

/** A buff's icon slot and the gap after it: how far its details are indented. */
const BUFF_INDENT = ICON + 4;
import { Sources } from "./item-source-rows";
import { ItemHover } from "./stat-row";

/** An item as the wiki lists it: its catalog entry, with nothing slotted. */
export type WikiItem = CatalogItem;

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
  const sources = itemSources(item.key);
  const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
  const color = CARD_COLORS[item.rarity] ?? CARD_COLORS.common;
  const { fixed, added } = described.mods;
  const modTriggers = [...(fixed?.triggers ?? []), ...added.triggers];
  const hasMods = !!fixed?.stats.length || added.stats.length > 0 || modTriggers.length > 0;
  const charClass = item.requirements?.charClass;
  /* "Unique scimitar · Lv 9": what it is and when it can be worn */
  /* The name's colour already says common; any other rarity is worth the word */
  const rarity = item.rarity === "common" ? "" : `${item.rarity} `;
  const category =
    item.type === "spell"
      ? `${capitalize(String(charClass ?? ""))} spell`
      : `${capitalize(rarity + described.kind)} · Lv ${item.level}`;
  /* By the name: a spell's rank, or gear's tier */
  const badge =
    described.level !== undefined ? (
      <RomanNumeral value={described.level} />
    ) : item.type !== "stackable" ? (
      <>
        Tier <RomanNumeral value={item.tier} />
      </>
    ) : undefined;

  const hasStats =
    described.stats.length > 0 ||
    described.effects.length > 0 ||
    described.buffs.length > 0 ||
    hasMods ||
    !!described.set;

  return (
    <Grid
      sx={{
        ...PAPER_STYLE,
        p: 4,
        columnGap: 4,
        rowGap: 3,
        /* As many columns as fit, none narrower than reads well: they wrap rather than crush */
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
        alignItems: "start",
      }}
    >
      <PaperFrame />
      <Flex sx={{ gap: 3, alignItems: "flex-start", minWidth: 0 }}>
        {/* The picture, with its tier just under it */}
        <Flex sx={{ flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
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
            {asset && (
              <ItemHover item={item}>
                <SpriteFace
                  asset={asset}
                  tint={item.tint}
                  size={64}
                  pixelScale={2}
                  elements={item.type === "weapon" ? itemEffects(item) : []}
                />
              </ItemHover>
            )}
          </Flex>
          {/* Its tier (a spell's rank) under the picture, clear of long names */}
          {badge && (
            <Text
              sx={{
                fontSize: 0,
                fontWeight: 700,
                color: PAPER.ink,
                bg: PAPER.frame,
                border: `1px solid ${PAPER.ornament}`,
                borderRadius: 2,
                px: 1,
                whiteSpace: "nowrap",
              }}
            >
              {badge}
            </Text>
          )}
        </Flex>
        <Box sx={{ minWidth: 0 }}>
          <Flex sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Text as="h3" sx={{ fontSize: 3, fontWeight: 700, m: 0, color }}>
              {described.title}
            </Text>
          </Flex>
          <Text as="p" sx={{ fontSize: 0, color: PAPER.muted, m: 0, mb: 1 }}>
            {category}
          </Text>
          <Text
            as="p"
            sx={{ color: PAPER.muted, fontSize: 1, fontStyle: "italic", lineHeight: 1.4, m: 0 }}
          >
            {item.flavor}
          </Text>
        </Box>
      </Flex>
      {/* The same sections as the item's tooltip; one with nothing in it isn't shown at all */}
      {described.fits ? (
        /* A card is only its mod, and the gear it sockets into: as its tooltip shows them */
        <Column label="Mod">
          <Lines lines={added.stats} />
          <Triggers triggers={added.triggers} />
          <Section title="Socket into">
            <GearSlotIcons types={described.fits} justify="flex-start" native />
          </Section>
        </Column>
      ) : (
        hasStats && (
          /* With no plain stats (a spell), its first section's own heading starts the column */
          <Column label={described.stats.length > 0 ? "Stats" : undefined}>
            <Lines lines={described.stats} />
            {described.effects.length > 0 && (
              <Section title="Effects">
                <Lines lines={described.effects} />
              </Section>
            )}
            {described.buffs.length > 0 && (
              <Section title="Casts">
                {described.buffs.map((buff) => (
                  <Buff key={buff.name} name={buff.name} level={buff.level} lines={buff.stats} />
                ))}
              </Section>
            )}
            {hasMods && (
              <Section title="Mods">
                <Lines lines={fixed?.stats ?? []} color={CARD_COLORS.unique} />
                <Triggers triggers={fixed?.triggers ?? []} color={CARD_COLORS.unique} />
                <Lines lines={added.stats} />
                <Triggers triggers={added.triggers} />
              </Section>
            )}
            {described.set && (
              <Section
                title={described.set.name}
                note={`${described.set.pieces} pieces`}
                color={CARD_COLORS.set}
              >
                <Lines lines={described.set.stats} color={CARD_COLORS.set} />
                <Triggers triggers={described.set.triggers} color={CARD_COLORS.set} />
              </Section>
            )}
          </Column>
        )
      )}
      {described.requirements.length > 0 && (
        <Column label="Requires">
          <Lines lines={described.requirements} />
        </Column>
      )}
      <Column label="Where to find">
        <Sources sources={sources} randomLevels={randomDropLevels(item.key)} />
      </Column>
    </Grid>
  );
};

/** A column under a divider like its sections', so each still reads when they stack on phones. */
const Column = ({ label, children }: { label?: string; children: ReactNode }) => (
  <Box sx={{ minWidth: 0, "& > :first-of-type": { mt: 0 } }}>
    {label && <Divider label={label} spacing={2} />}
    {children}
  </Box>
);

/** A buff the item gives or can trigger, as a group with its spell icon. */
const Buff = ({
  name,
  level,
  color,
  lines,
}: {
  name: string;
  level: number;
  /** Where it comes from (a mod, a set), for the whole buff; plain ink otherwise. */
  color?: string;
  lines: StatLine[];
}) => (
  <Group
    icon={<Icon icon={`./assets/atlas/spell/spell-${name}.png`} size={NATIVE_ICON} />}
    label={capitalize(name)}
    note={<RomanNumeral value={level} />}
    color={color}
    bold={false}
    lines={lines}
  />
);

/** A named block of stats: a header row with its icon, then its stats indented past the icon. */
const Group = ({
  icon,
  label,
  note = "",
  color,
  bold,
  lines,
}: {
  icon: ReactNode;
  label: string;
  note?: ReactNode;
  /** Where it comes from, for the header only; plain ink otherwise. */
  color?: string;
  bold?: boolean;
  lines: StatLine[];
}) => (
  <Box>
    <Row
      icon={icon}
      label={label}
      value={note}
      labelColor={color ?? PAPER.ink}
      valueColor={color}
      bold={bold}
    />
    {/* Under the header, branching down from its icon */}
    <Box sx={treeBranches({ indent: BUFF_INDENT, stem: ICON / 2, color: PAPER.ornament })}>
      {/* Details stay plain: the header's colour already says where the buff comes from */}
      <Lines lines={lines} small />
    </Box>
  </Box>
);

/**
 * Stat lines, as rows. A `color` marks where they come from (a unique's mod, a set): the whole
 * row takes it, so a mod reads as one thing.
 */
const Lines = ({ lines, color, small }: { lines: StatLine[]; color?: string; small?: boolean }) => (
  <>
    {lines.map((line, i) => (
      <Row
        key={`${line.label}-${i}`}
        label={words(line.label)}
        value={range(line.value)}
        labelColor={color}
        valueColor={color}
        bold={false}
        small={small}
      />
    ))}
  </>
);

/** A part of the stats under a divider like a keeper card's, its rows flush with the rest. */
const Section = ({
  title,
  note,
  color = PAPER.muted,
  children,
}: {
  title: string;
  note?: string;
  color?: string;
  children: ReactNode;
}) => (
  <>
    <Divider label={note ? `${title} · ${note}` : title} color={color} spacing={2} />
    {children}
  </>
);

/** Buffs and debuffs an item or set can trigger: the buff, then its chance and what it does. */
const Triggers = ({ triggers, color }: { triggers: TriggerLine[]; color?: string }) => (
  <>
    {triggers.map((trigger, i) => (
      <Buff
        key={`${trigger.name}-${i}`}
        name={trigger.name}
        level={trigger.level}
        color={color}
        lines={[
          { label: `chance on ${trigger.when}`, value: `${trigger.chancePercent}%` },
          ...trigger.stats,
        ]}
      />
    ))}
  </>
);
