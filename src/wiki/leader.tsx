import { Box, Flex } from "@/ui";
import type { ReactNode } from "react";
import { PAPER } from "./paper";

/**
 * A label joined to its value by dots sitting on the text's baseline, as a book's contents do.
 * The three align by baseline among themselves, so a row can still centre an icon beside them.
 * A label that is a box (a sprite beside a name) aligns by the first text inside it that has
 * `alignSelf: "baseline"`.
 */
export const DottedLine = ({
  label,
  value,
  color = PAPER.ornament,
}: {
  label: ReactNode;
  value: ReactNode;
  /** The dots' colour; lighter on a dark tooltip. */
  color?: string;
}) => (
  <Flex sx={{ flex: 1, minWidth: 0, alignItems: "baseline", gap: 1 }}>
    {label}
    <Box aria-hidden sx={{ flex: 1, minWidth: 8, borderBottom: `1px dotted ${color}` }} />
    {value}
  </Flex>
);
