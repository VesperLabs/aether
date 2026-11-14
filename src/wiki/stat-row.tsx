import type { BuiltItem, CatalogItem } from "@/content";
import { Box, Flex, ItemTooltip, Text } from "@/ui";
import { useId, useState, type ReactNode } from "react";
import { PAPER } from "./paper";
import { DottedLine } from "./leader";

/** Every dotted row is the height of a 24px icon, so rows with and without icons match. */
export const ROW_STYLE = { alignItems: "center", minHeight: 24, minWidth: 0 } as const;

/** One stat as a label and value joined by a dotted leader. */
export const Stat = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
  <Flex sx={{ ...ROW_STYLE, gap: 1 }}>
    <DottedLine
      label={
        typeof label === "string" ? (
          <Text sx={{ color: PAPER.muted, whiteSpace: "nowrap" }}>{label}</Text>
        ) : (
          label
        )
      }
      value={<Text sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{value}</Text>}
    />
  </Flex>
);

/** Shows the game's item tooltip while its contents are hovered. */
export const ItemHover = ({
  item,
  gap = 2,
  children,
}: {
  item: CatalogItem;
  /** Space between the icon and the name. */
  gap?: number;
  children: ReactNode;
}) => {
  const [hovering, setHovering] = useState(false);
  const tooltipId = useId();
  return (
    <Box
      as="span"
      data-tooltip-id={tooltipId}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{ cursor: "help", display: "inline-flex", alignItems: "center", gap, minWidth: 0 }}
    >
      {children}
      <ItemTooltip item={item as BuiltItem} show={hovering} tooltipId={tooltipId} />
    </Box>
  );
};
