import type { GearType } from "@/content";
import { Box, Flex, Icon } from "@/ui/kit";
import { ArtIcon } from "./art-icon";

/** Each gear type's empty-slot icon, the one its equipment slot shows. */
const GEAR_ICONS: Record<GearType, string> = {
  weapon: "handRight",
  ranged: "ranged",
  shield: "handLeft",
  helmet: "helmet",
  armor: "armor",
  gloves: "gloves",
  boots: "boots",
  pants: "pants",
  accessory: "accessory",
  ring: "ring1",
  amulet: "amulet",
  bag: "bag",
};

/** The gear a card can socket into, as their slots' icons in grey. Tooltip and wiki alike. */
export const GearSlotIcons = ({
  types,
  justify = "center",
  native = false,
}: {
  types: readonly GearType[];
  justify?: "center" | "flex-start";
  /** At the art's own 32px, every pixel kept (the wiki); else fitted small (the tooltip). */
  native?: boolean;
}) => (
  <Flex sx={{ gap: native ? 0 : "6px", flexWrap: "wrap", justifyContent: justify }}>
    {types.map((type) => (
      <Box key={type} title={type} aria-label={type} sx={{ opacity: 0.85, filter: "grayscale(1)" }}>
        {native ? (
          <Icon icon={`./assets/icons/${GEAR_ICONS[type]}.png`} size={32} />
        ) : (
          <ArtIcon src={`./assets/icons/${GEAR_ICONS[type]}.png`} size={16} />
        )}
      </Box>
    ))}
  </Flex>
);
