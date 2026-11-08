import { randomDropLevel, resolveAsset, type ItemDefinition } from "@/content";
import {
  buffLines,
  describeItem,
  SHOP_INFLATION,
  type DescribableItem,
  type StatLine,
} from "@/rules/inventory";
import { Box, deriveElements, Flex, Grid, Icon, Text, Tooltip, TooltipContent } from "@/ui";
import { Fragment, useId, type ReactNode } from "react";
import { CARD_COLORS, SpriteFace } from "./card-pool";
import { itemSources } from "./item-sources";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";
import { ICON, Row } from "./card-row";
import { Sources } from "./item-source-rows";

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
        {/* The picture, with what it sells for just under it */}
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
              <SpriteFace
                asset={asset}
                tint={item.tint}
                size={64}
                pixelScale={2}
                elements={item.type === "weapon" ? deriveElements(item.stats) : []}
              />
            )}
          </Flex>
          {described.cost > 0 && <GoldBadge cost={described.cost} />}
        </Flex>
        <Box sx={{ minWidth: 0 }}>
          <Flex sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Text as="h3" sx={{ fontSize: 3, fontWeight: 700, m: 0, color }}>
              {described.title}
            </Text>
            {/* Spells level up with the item, so their level stands out. */}
            {described.level !== undefined && (
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
                Lv. {described.level}
              </Text>
            )}
          </Flex>
          <Text as="p" sx={{ fontSize: 0, color: PAPER.muted, m: 0, mb: 1 }}>
            {category}
            {described.level === undefined && ` · item level ${item.ilvl}`}
          </Text>
          <Text
            as="p"
            sx={{ color: PAPER.muted, fontSize: 1, fontStyle: "italic", lineHeight: 1.4, m: 0 }}
          >
            {item.flavor}
          </Text>
        </Box>
      </Flex>
      <Column label="Effects">
        {!lines.length && !described.buffs.length && !described.triggers.length && <None />}
        <Lines lines={lines} />
        {described.buffs.map((buff) => (
          <Buff key={buff.name} name={buff.name} level={buff.level} lines={buff.stats} />
        ))}
        {described.triggers.map((trigger, i) => (
          <Buff
            key={`${trigger.name}-${i}`}
            name={trigger.name}
            level={trigger.level}
            note={`${trigger.chancePercent}% ${trigger.when}`}
            lines={buffLines(trigger.name, trigger.level)}
          />
        ))}
        {described.set && (
          <Group
            icon={<Icon icon="./assets/icons/success.png" size={ICON} />}
            label={described.set.name}
            note={`${described.set.pieces} pieces`}
            color={CARD_COLORS.set}
            lines={described.set.stats}
          />
        )}
      </Column>
      <Column label="Requires">
        {described.requirements.length ? <Lines lines={described.requirements} /> : <None />}
      </Column>
      <Column label="Where to find">
        <Sources
          sources={sources}
          randomLevel={randomDropLevel(item.type, item.rarity, item.key)}
        />
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

/** A buff the item gives or can trigger, as a group with its spell icon. */
const Buff = ({
  name,
  level,
  note,
  lines,
}: {
  name: string;
  level: number;
  note?: string;
  lines: StatLine[];
}) => (
  <Group
    icon={<Icon icon={`./assets/atlas/spell/spell-${name}.png`} size={ICON} />}
    label={`${capitalize(name)} Lv. ${level}`}
    note={note}
    color={PAPER.ink}
    lines={lines}
  />
);

/** A named block of stats: a header row with its icon, then its stats indented past the icon. */
const Group = ({
  icon,
  label,
  note = "",
  color,
  lines,
}: {
  icon: ReactNode;
  label: string;
  note?: string;
  color: string;
  lines: StatLine[];
}) => (
  <Box sx={{ mt: 2 }}>
    <Row icon={icon} label={label} value={note} labelColor={color} />
    <Box sx={{ pl: `${ICON + 4}px` }}>
      <Lines lines={lines} />
    </Box>
  </Box>
);

const None = () => <Text sx={{ fontSize: 1, color: PAPER.muted }}>—</Text>;

/** Stat lines, as rows. */
const Lines = ({ lines }: { lines: StatLine[] }) => (
  <>
    {lines.map((line, i) => (
      <Row key={`${line.label}-${i}`} label={words(line.label)} value={range(line.value)} />
    ))}
  </>
);

/** What the item is worth, as a faint badge under its picture; hover shows what shops buy and sell it for. */
const GoldBadge = ({ cost }: { cost: number }) => {
  const tooltipId = useId();
  return (
    <Flex
      data-tooltip-id={tooltipId}
      sx={{
        alignItems: "center",
        gap: 1,
        pl: 1,
        pr: 2,
        bg: "rgba(0,0,0,.05)",
        borderRadius: 2,
        fontSize: 0,
        fontWeight: 700,
        color: PAPER.ink,
        whiteSpace: "nowrap",
        cursor: "help",
      }}
    >
      {/* At its native 32px, as halving pixel art drops every other pixel; it overhangs the badge */}
      <Icon icon="./assets/icons/gold.png" size={32} sx={{ my: "-8px", mx: "-6px" }} />
      {cost}
      <Tooltip id={tooltipId}>
        <TooltipContent sx={{ alignItems: "stretch", textTransform: "none", fontSize: 1 }}>
          {/* Shops charge the inflated price, as the game does, and pay the plain value back */}
          <Grid
            sx={{
              gridTemplateColumns: "max-content minmax(20px, 1fr) max-content",
              columnGap: 2,
              rowGap: 2,
              /* The dots sit on the text's baseline, as on every wiki row */
              alignItems: "baseline",
            }}
          >
            {[
              ["Buy", Math.round(cost * SHOP_INFLATION)],
              ["Sell", cost],
            ].map(([label, gold]) => (
              <Fragment key={label}>
                <Text sx={{ opacity: 0.6, fontWeight: 400 }}>{label}</Text>
                <Box sx={{ borderBottom: "1px dotted rgba(255,255,255,.25)" }} />
                <Flex sx={{ alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                  <Icon icon="./assets/icons/gold.png" size={32} sx={{ my: "-8px", mx: "-6px" }} />
                  <Text sx={{ alignSelf: "baseline" }}>{gold}</Text>
                </Flex>
              </Fragment>
            ))}
          </Grid>
        </TooltipContent>
      </Tooltip>
    </Flex>
  );
};
