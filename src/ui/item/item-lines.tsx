import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import type { StatLine, TriggerLine } from "@/rules/inventory";
import { Box, Flex, Text } from "@/ui/kit";
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

/** A buff's (or spell's) icon, the one the buff rack shows. */
export const spellIcon = (name: string) => `./assets/atlas/spell/spell-${name}.png`;

const RULE = "rgba(255, 255, 255, 0.16)";

/** A hairline that fades out toward the tooltip's edges. */
export const FadedRule = () => (
  <Box
    aria-hidden
    sx={{
      width: "100%",
      height: "1px",
      my: "6px",
      background: `linear-gradient(to right, transparent, ${RULE}, transparent)`,
    }}
  />
);

/**
 * A section heading as the wiki sets them: small spaced capitals between two hairlines, here
 * fading out toward the edges.
 */
export const SectionTitle = ({ children, color }: { children: ReactNode; color?: string }) => (
  <Flex sx={{ alignItems: "center", gap: 2, width: "100%", mt: "6px", mb: "2px" }}>
    <Box
      sx={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${RULE})` }}
    />
    <Text
      sx={{
        ...TYPE.meta,
        color: color ?? "gray.500",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
    <Box
      sx={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${RULE})` }}
    />
  </Flex>
);

/** A small grey level after a name, on the name's baseline. */
export const Level = ({ level }: { level: number }) => (
  <Text sx={{ ...TYPE.meta, ml: 1, color: "gray.400" }}>Lv {level}</Text>
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
      borderBottom: "1px dotted rgba(255, 255, 255, 0.14)",
    }}
  />
);

/** A label, a leader, then the value right-aligned. */
const Row = ({ label, value, color }: { label: ReactNode; value: ReactNode; color?: string }) => (
  <Flex sx={{ alignItems: "center" }}>
    <Text sx={{ ...TYPE.body, fontWeight: "normal", color: color ?? "gray.400" }}>{label}</Text>
    <Leader />
    {typeof value === "string" ? <Text sx={{ ...TYPE.body, color }}>{value}</Text> : value}
  </Flex>
);

/** "attackDelay" reads "attack Delay" (the tooltip capitalizes each word). */
const spaced = (label: string) => label.replace(/([a-z])([A-Z])/g, "$1 $2");

/** One "label ····· value" row per stat, for inside a `StatGrid`. */
export const StatRows = ({ lines, color }: { lines: StatLine[]; color?: string }) =>
  lines.map(({ label, value }) => (
    <Row key={label} label={spaced(label)} value={value} color={color} />
  ));

/** A buff with its icon: "[icon] Stun Lv 2", a `body` line. */
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
  <Flex sx={{ alignItems: "center", gap: 1, color, ...sx }}>
    <ArtIcon src={spellIcon(name)} size={BODY_ICON} />
    {/* Name and level share a line of text, so they sit on one baseline like the item's title */}
    <Text sx={TYPE.body}>
      {name}
      <Level level={level} />
    </Text>
  </Flex>
);

/** "20% on hit ····· [icon] Stun Lv 2" rows, for inside a `StatGrid`. */
export const TriggerRows = ({ triggers, color }: { triggers: TriggerLine[]; color?: string }) =>
  triggers.map((t, idx) => (
    <Row
      key={idx}
      label={`${t.chancePercent}% ${t.when}`}
      value={<BuffName name={t.name} level={t.level} color={color} />}
      color={color}
    />
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
