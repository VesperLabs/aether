import { useEffect, useState } from "react";
import { Box } from "theme-ui";
import { assetList } from "@/content";
import { assetToCanvas } from "./asset-to-canvas";
import { Icon } from "./icon";

/** One size for every dropdown thumbnail, so options line up whatever they show. */
export const THUMB_SIZE = 24;
/** A colour chip sits inside a thumbnail's square, a little smaller so it reads as a chip. */
const SWATCH_SIZE = 18;

/** A sheet's art, tinted if given, trimmed and fitted into a thumbnail. */
export const SheetThumb = ({ texture, tint }: { texture: string; tint?: string }) => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const asset = assetList.find((option) => option.texture === texture);
    return asset && assetToCanvas({ asset, tint, setImageData: setUrl });
  }, [texture, tint]);

  return <Icon icon={url} size={THUMB_SIZE} sx={{ flexShrink: 0, backgroundSize: "contain" }} />;
};

/** A colour option: a round chip of the tint, centred in a thumbnail's square. */
export const SwatchThumb = ({ tint }: { tint: string }) => (
  <Box
    sx={{
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
      width: THUMB_SIZE,
      height: THUMB_SIZE,
    }}
  >
    <Box
      sx={{
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        borderRadius: "50%",
        bg: tint.replace(/^0x/, "#"),
        boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, .5)",
      }}
    />
  </Box>
);
