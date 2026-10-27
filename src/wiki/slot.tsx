import { useLayoutEffect, useState } from "react";
import { resolveAsset, type BuiltItem } from "@/content";
import { assetToCanvas, Box, Icon, ItemTooltip, STYLE_NON_EMPTY, SLOT_SIZE } from "@/ui";

/** An item as the wiki lists it: the definition with its tier, not an item a player owns. */
export type WikiItem = Partial<BuiltItem>;

export function Slot({ item }: { item: WikiItem }) {
  const [imageData, setImageData] = useState<string>();
  /* Loads the item canvas data out of the texture */
  useLayoutEffect(() => {
    if (!item) return;
    const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
    if (!asset) return;
    assetToCanvas({ asset, tint: item?.tint, setImageData });
  }, [item]);

  return (
    <Box
      sx={{
        ...STYLE_NON_EMPTY({ rarity: item?.rarity as string }),
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        "&:hover > .icon": {
          transition: ".1s ease all",
          transform: "scale(2)",
        },
        cursor: "pointer",
      }}
      data-tooltip-id={item?.key}
    >
      <ItemTooltip item={item} tooltipId={item?.key as string} />
      <Icon
        className="icon"
        icon={imageData}
        size={SLOT_SIZE}
        sx={{
          pointerEvents: "none",
          imageRendering: "pixelated",
        }}
      ></Icon>
    </Box>
  );
}
