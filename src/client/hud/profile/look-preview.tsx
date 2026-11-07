import { useEffect, useState } from "react";
import { assetList, type MobProfile } from "@/content";
import { assetToCanvas, Box, Icon, PlayerPortrait } from "@/ui";

const PREVIEW_SIZE = 32;
const SWATCH_SIZE = 20;
/** Left off the body preview, so it shows just the body. */
const BARE_SLOTS = ["hair", "face", "whiskers"];

/** One part's own art, tinted, trimmed and fitted the way the sprite lab shows a sheet. */
export const LookPreview = ({ texture, tint }: { texture: string; tint?: string }) => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const asset = assetList.find((option) => option.texture === texture);
    return asset && assetToCanvas({ asset, tint, setImageData: setUrl });
  }, [texture, tint]);

  return <Icon icon={url} size={PREVIEW_SIZE} sx={{ flexShrink: 0, backgroundSize: "contain" }} />;
};

/** A colour option: a round chip of the tint itself. */
export const SwatchPreview = ({ tint }: { tint: string }) => (
  <Box
    sx={{
      flexShrink: 0,
      width: `${SWATCH_SIZE}px`,
      height: `${SWATCH_SIZE}px`,
      /* Keeps the row as tall as the art previews, without the extra room at its sides. Plain
         pixels: a bare number would be read as a step on the theme's spacing scale */
      my: `${(PREVIEW_SIZE - SWATCH_SIZE) / 2}px`,
      borderRadius: "50%",
      bg: tint.replace(/^0x/, "#"),
      boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, .5)",
    }}
  />
);

/** A body option: the bare human, chest and all, in the character's skin. */
export const BodyPreview = ({ gender, tint }: { gender: MobProfile["gender"]; tint?: string }) => (
  <PlayerPortrait
    player={{ profile: { userName: "", race: "human", gender, tint } }}
    filteredSlots={BARE_SLOTS}
    scale={1}
    sx={{ flexShrink: 0 }}
  />
);
