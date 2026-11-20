import { buffIcon } from "@/content";
import { Fragment, type ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import type { StatLine, TriggerLine } from "@/rules/inventory";
import { Box, Flex, RomanNumeral, Text, treeBranches } from "@/ui/kit";

/** The faint grey of every dotted line: the leaders joining labels to values, and buff branches. */
const DOTS = "rgba(255, 255, 255, 0.15)";
/** A buff's tree: brighter than the leaders, so its details read as hanging off it. */
const TREE = "rgba(255, 255, 255, 0.4)";
import { ArtIcon } from "./art-icon";

/**
 * The tooltip's only three text styles. Each has a fixed line height, so every row is the same
 * height and icons sized to the line sit centred on it.
 */
export const TYPE = {
  /** The item's name. */
  name: { fontSize: 2, fontWeight: "bold", lineHeight: "18px" },
  /** Stat rows, buff names, costs. */
  body: { fontSize: 1, fontWeight: "bold", lineHeight: "16px" },
  /** Rarity, levels, section titles, hints. */
  meta: { fontSize: 0, fontWeight: "normal", lineHeight: "14px" },
} as const;

/** Icons in a `body` line: a little under its height. */
export const BODY_ICON = 14;

/** The space between a buff's icon and its name. */
const ICON_GAP = 4;

/** A buff's icon and the gap after it: how far it hangs out into the gutter. */
const BUFF_INDENT = BODY_ICON + ICON_GAP;

/**
 * Hangs a buff's icon out in the tooltip's side padding, so its name lines up with every other
 * row's label instead of being pushed in by the icon.
 */
const ICON_IN_GUTTER = { ml: -BUFF_INDENT, width: `calc(100% + ${BUFF_INDENT}px)` } as const;

/** A buff's (or spell's) icon, the one the buff rack shows. */
export const spellIcon = (name: string) => `./assets/atlas/spell/spell-${name}.png`;

/** A buff's icon, which a few buffs share (every holy one shows the holy icon). */
const buffIconSrc = (name: string) => `./assets/atlas/spell/${buffIcon(name)}.png`;

const RULE = "rgba(255, 255, 255, 0.16)";

/** A title's rules never shrink below this, so a long title (a set's name) widens the tooltip. */
const RULE_STYLE = { flex: 1, minWidth: 16, height: "1px" } as const;

/** Where a title's rule starts at the tooltip's edge: faint, but never gone. */
const RULE_EDGE = "rgba(255, 255, 255, 0.05)";

/**
 * A section heading: small spaced capitals between two hairlines that fade toward the edges but never vanish.
 */
export const SectionTitle = ({ children, color }: { children: ReactNode; color?: string }) => (
  <Flex sx={{ alignItems: "center", width: "100%", mt: "8px", mb: "3px" }}>
    <Box sx={{ ...RULE_STYLE, background: `linear-gradient(to right, ${RULE_EDGE}, ${RULE})` }} />
    <Text
      sx={{
        ...TYPE.meta,
        color: color ?? "gray.500",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        px: "6px",
      }}
    >
      {children}
    </Text>
    <Box sx={{ ...RULE_STYLE, background: `linear-gradient(to left, ${RULE_EDGE}, ${RULE})` }} />
  </Flex>
);

/**
 * A section title in small, for a column: the same letter-spaced capitals between short fading
 * lines, sized to the column it heads ("DMG" over a damage column).
 */
export const ColumnTitle = ({
  children,
  color,
  width,
}: {
  children: ReactNode;
  color?: string;
  width: number;
}) => (
  <Flex sx={{ alignItems: "center", justifyContent: "center", width }}>
    <Box
      sx={{
        flex: 1,
        height: "1px",
        background: `linear-gradient(to right, ${RULE_EDGE}, ${RULE})`,
      }}
    />
    <Text
      sx={{
        ...TYPE.meta,
        color: color ?? "gray.500",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        px: "3px",
      }}
    >
      {children}
    </Text>
    <Box
      sx={{ flex: 1, height: "1px", background: `linear-gradient(to left, ${RULE_EDGE}, ${RULE})` }}
    />
  </Flex>
);

/** A grey rank after a name, as a numeral ("Fireball II"), on the name's baseline. */
export const Level = ({ level }: { level: number }) => (
  /* The size of the name it follows: "Fireball II" reads as one title */
  <Text sx={{ ml: 1, color: "gray.400" }}>
    <RomanNumeral value={level} />
  </Text>
);

/** A block of stat rows, full width. */
export const StatGrid = ({ children }: { children: ReactNode }) => (
  <Flex sx={{ flexDirection: "column", width: "100%" }}>{children}</Flex>
);

/** The faint dotted line joining a row's label to its value, at the text's baseline (as the wiki). */
const Leader = () => (
  <Box
    aria-hidden
    sx={{
      flex: 1,
      minWidth: 8,
      mx: 1,
      transform: "translateY(0.35em)",
      borderBottom: `1px dotted ${DOTS}`,
    }}
  />
);

/** A label, a leader, then the value right-aligned. */
export const StatRow = ({
  label,
  value,
  color,
  type = TYPE.body,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
  /** Its text style; a tooltip's body by default. A roomier screen passes a larger one. */
  type?: { fontSize: number; lineHeight: string };
}) => {
  return (
    /* Exactly one line tall, icon or not */
    <Flex sx={{ alignItems: "center", height: type.lineHeight }}>
      {typeof label === "string" ? (
        <Text sx={{ ...type, fontWeight: "normal", color: color ?? "gray.400" }}>{label}</Text>
      ) : (
        label
      )}
      <Leader />
      {/* Values are always bold, and keep their case ("2/s") under a capitalizing tooltip */}
      {typeof value === "string" ? (
        <Text sx={{ ...type, fontWeight: "bold", color, textTransform: "none" }}>{value}</Text>
      ) : (
        value
      )}
    </Flex>
  );
};

/** "attackDelay" reads "attack Delay" (the tooltip capitalizes each word). */
const spaced = (label: string) => label.replace(/([a-z])([A-Z])/g, "$1 $2");

/** One "label ····· value" row per stat, for inside a `StatGrid`. */
export const StatRows = ({ lines, color }: { lines: StatLine[]; color?: string }) =>
  lines.map(({ label, value, note }) => (
    <StatRow
      key={label}
      label={spaced(label)}
      value={note ? <Note value={value} note={note} color={color} /> : value}
      color={color}
    />
  ));

/** A card's value and how the gear's tier grows it: "2" then a small grey "(×tier)" or "(+2/tier)". */
const Note = ({ value, note, color }: { value: string; note: string; color?: string }) => (
  <Text sx={{ ...TYPE.body, fontWeight: "bold", color, textTransform: "none" }}>
    {value}
    <Text sx={{ ...TYPE.meta, ml: 1, fontWeight: "normal", color: "gray.400" }}>{note}</Text>
  </Text>
);

/** What a buff does, under its name: rows branching down from its icon, as in the wiki. */
export const BuffDetails = ({ lines }: { lines: StatLine[] }) =>
  lines.length > 0 && (
    /* From the icon in the gutter, so the rows line up with the buff's name */
    <Box sx={ICON_IN_GUTTER}>
      <Box sx={treeBranches({ indent: BUFF_INDENT, stem: BODY_ICON / 2, color: TREE })}>
        <StatRows lines={lines} />
      </Box>
    </Box>
  );

/** A buff with its icon: "[icon] Stun II", a `body` line. */
export const BuffName = ({
  name,
  level,
  color,
  sx,
}: {
  name: string;
  level: number;
  color?: string;
  sx?: ThemeUIStyleObject;
}) => (
  /* The grey of every row's label */
  <Flex
    sx={{
      alignItems: "center",
      gap: `${ICON_GAP}px`,
      color: color ?? "gray.400",
      ml: -BUFF_INDENT,
      ...sx,
    }}
  >
    <ArtIcon src={buffIconSrc(name)} size={BODY_ICON} />
    {/* Name and level share a line of text, so they sit on one baseline like the item's title */}
    <Text sx={{ ...TYPE.body, fontWeight: "normal" }}>
      {name}
      <Level level={level} />
    </Text>
  </Flex>
);

/**
 * "[icon] Poison II ····· (hit) 25%": what it is on the left, how often on the right, each a
 * body word with a small one after it: its level, and whether a hit or getting hurt sets it off. The icon hangs in the gutter, so the name lines up with
 * the rows around it.
 */
export const TriggerRows = ({ triggers, color }: { triggers: TriggerLine[]; color?: string }) =>
  triggers.map((t, idx) => (
    <Fragment key={idx}>
      <Box sx={ICON_IN_GUTTER}>
        <StatRow
          label={
            <Flex sx={{ alignItems: "center", gap: `${ICON_GAP}px`, minWidth: 0 }}>
              <ArtIcon src={buffIconSrc(t.name)} size={BODY_ICON} />
              <Text sx={{ ...TYPE.body, fontWeight: "normal", color: color ?? "gray.400" }}>
                {t.name}
                {t.perTier ? (
                  <Text sx={{ ...TYPE.meta, ml: 1, color: "gray.400" }}>(×tier)</Text>
                ) : (
                  <Level level={t.level} />
                )}
              </Text>
            </Flex>
          }
          value={
            <Text sx={{ ...TYPE.body, fontWeight: "bold", color }}>
              <Text sx={{ ...TYPE.meta, mr: 1, color: "gray.400" }}>({t.when})</Text>
              {t.chancePercent}%
            </Text>
          }
          color={color}
        />
      </Box>
      {/* What the buff does, branching down from it */}
      <BuffDetails lines={t.stats} />
    </Fragment>
  ));

/** A titled grid of stat rows; renders nothing when there are none. */
export const StatSection = ({ title, lines }: { title: string; lines: StatLine[] }) =>
  lines.length > 0 && (
    <>
      <SectionTitle>{title}</SectionTitle>
      <StatGrid>
        <StatRows lines={lines} />
      </StatGrid>
    </>
  );
