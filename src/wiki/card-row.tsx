import { Flex, Text } from "@/ui";
import type { ReactNode } from "react";
import { PAPER } from "./paper";
import { DottedLine } from "./leader";

/** The size of every icon on the card, and of the slot that holds it. */
export const ICON = 32;

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
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
}) => (
  <Flex sx={{ alignItems: "center", gap: 1, fontSize: 1, minHeight: icon ? ICON : undefined }}>
    {icon && (
      <Flex
        sx={{
          width: ICON,
          height: ICON,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
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
            fontWeight: labelColor ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Text>
      }
      value={
        <Text
          sx={{
            color: valueColor ?? (labelColor ? PAPER.muted : PAPER.ink),
            fontWeight: labelColor ? 400 : 700,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </Text>
      }
    />
  </Flex>
);
