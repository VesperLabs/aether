import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import type { StatLine, TriggerLine } from "@/rules/inventory";
import { Box, Flex, RomanNumeral, Text } from "@/ui/kit";

/** The faint grey of every dotted line: the leaders joining labels to values, and buff branches. */
const DOTS = "rgba(255, 255, 255, 0.15)";
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

const RULE = "rgba(255, 255, 255, 0.16)";

/** The tooltip's own side padding plus the item tooltip's: how far a divider reaches out. */
const TOOLTIP_INSET = 16 + 8;

/** Splits the tooltip's footer (hints, then costs) from its sections, from edge to edge. */
export const Divider = () => (
  <Box
    aria-hidden
    sx={{ alignSelf: "stretch", height: "1px", bg: RULE, mx: -TOOLTIP_INSET, my: "6px" }}
  />
);

/** A title's rules never shrink below this, so a long title (a set's name) widens the tooltip. */
const RULE_STYLE = { flex: 1, minWidth: 16, height: "1px" } as const;

/** A 3px square where a title's rule meets its text: crisp, like the pixel art. */
const RulePip = () => (
  <Box aria-hidden sx={{ width: 3, height: 3, flexShrink: 0, bg: "rgba(255, 255, 255, 0.35)" }} />
);

/**
 * A section heading: small spaced capitals between two hairlines that fade out toward the edges, each ending in a square pip beside the text.
 */
export const SectionTitle = ({ children, color }: { children: ReactNode; color?: string }) => (
  <Flex sx={{ alignItems: "center", width: "100%", mt: "8px", mb: "3px" }}>
    <Box sx={{ ...RULE_STYLE, background: `linear-gradient(to right, transparent, ${RULE})` }} />
    <RulePip />
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
    <RulePip />
    <Box sx={{ ...RULE_STYLE, background: `linear-gradient(to left, transparent, ${RULE})` }} />
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
const Row = ({
  label,
  value,
  color,
  small = false,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
  /** A detail of the row above (a buff's chance), in the small type so it isn't read as a stat. */
  small?: boolean;
}) => {
  /* Small text on the same line height, so every row spaces the same */
  const type = small ? { ...TYPE.meta, lineHeight: TYPE.body.lineHeight } : TYPE.body;
  return (
    /* Exactly one body line tall, icon or not */
    <Flex sx={{ alignItems: "center", height: TYPE.body.lineHeight }}>
      {typeof label === "string" ? (
        <Text sx={{ ...type, fontWeight: "normal", color: color ?? "gray.400" }}>{label}</Text>
      ) : (
        label
      )}
      <Leader />
      {/* Values are always bold */}
      {typeof value === "string" ? (
        <Text sx={{ ...type, fontWeight: "bold", color }}>{value}</Text>
      ) : (
        value
      )}
    </Flex>
  );
};

/** "attackDelay" reads "attack Delay" (the tooltip capitalizes each word). */
const spaced = (label: string) => label.replace(/([a-z])([A-Z])/g, "$1 $2");

/** One "label ····· value" row per stat, for inside a `StatGrid`. */
export const StatRows = ({
  lines,
  color,
  small,
}: {
  lines: StatLine[];
  color?: string;
  small?: boolean;
}) =>
  lines.map(({ label, value }) => (
    <Row key={label} label={spaced(label)} value={value} color={color} small={small} />
  ));

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
    <ArtIcon src={spellIcon(name)} size={BODY_ICON} />
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
    <Box key={idx} sx={ICON_IN_GUTTER}>
      <Row
        label={
          <Flex sx={{ alignItems: "center", gap: `${ICON_GAP}px`, minWidth: 0 }}>
            <ArtIcon src={spellIcon(t.name)} size={BODY_ICON} />
            <Text sx={{ ...TYPE.body, fontWeight: "normal", color: color ?? "gray.400" }}>
              {t.name}
              <Level level={t.level} />
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
