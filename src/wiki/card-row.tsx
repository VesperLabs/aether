import { Flex, Text } from "@/ui";
import type { ReactNode } from "react";
import { PAPER } from "./paper";
import { DottedLine } from "./leader";
import { ROW_STYLE } from "./stat-row";

/** The slot every row's icon sits in, as tall as the row, so rows with and without icons match. */
export const ICON = 24;

/**
 * The game's 32px icons, drawn at their native size (halving pixel art drops every other pixel).
 * Their art sits inside transparent padding, so they overhang the 24px slot without crowding.
 */
export const NATIVE_ICON = 32;

/**
 * Every line on the card: an optional icon, a label and a value joined by a dotted leader.
 * A `labelColor` names something (a monster, a buff), so it's bold; plain stat labels are muted
 * and their value is bold instead.
 */
export const Row = ({
  icon,
  label,
  value,
  labelColor,
  valueColor,
  bold = !!labelColor,
  small = false,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  labelColor?: string;
  valueColor?: string;
  /** Whether the label is bold: by default when it names something (a monster, a set). */
  bold?: boolean;
  /** A detail of the row above (what a buff does), in smaller type so it isn't read as a stat. */
  small?: boolean;
}) => (
  <Flex
    sx={{
      ...ROW_STYLE,
      gap: 1,
      fontSize: small ? 0 : 1,
    }}
  >
    {icon && (
      <Flex
        sx={{
          width: ICON,
          height: ICON,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        {icon}
      </Flex>
    )}
    <DottedLine
      label={
        <Text
          sx={{
            color: labelColor ?? PAPER.muted,
            fontWeight: bold ? 600 : 400,
            /* A long name (a quest) wraps rather than running into its value */
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {label}
        </Text>
      }
      value={
        <Text
          sx={{
            color: valueColor ?? (labelColor ? PAPER.muted : PAPER.ink),
            /* Values are always bold */
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {value}
        </Text>
      }
    />
  </Flex>
);
