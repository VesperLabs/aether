import { useEffect, useState } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { assetToDataUrl } from "@/ui/kit/image-tint";
import { Icon } from "@/ui/kit/icon";

/** Who wears an item when its art depends on the wearer and nobody is given (armor is drawn per race). */
export const DEFAULT_ASSET_USER = { profile: { race: "human", gender: "female" } };

/**
 * Art drawn to fill a `size` box whatever its frame: trimmed of empty border first, so a small
 * buff icon and a big two-handed weapon read at the same size side by side.
 */
export const ArtIcon = ({
  src,
  rect,
  tint,
  size,
  sx,
}: {
  src: string;
  /** The art's part of a sheet; the whole image without one. */
  rect?: readonly number[];
  tint?: string;
  size: number;
  sx?: ThemeUIStyleObject;
}) => {
  const [art, setArt] = useState<string>();
  const rectKey = rect?.join(",");
  useEffect(() => {
    let live = true;
    assetToDataUrl({ src, previewRect: rectKey ? rectKey.split(",").map(Number) : undefined }, tint)
      .then((url) => live && setArt(url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, rectKey, tint]);
  return (
    <Icon
      icon={art}
      size={size}
      sx={{ flexShrink: 0, backgroundSize: "contain", opacity: art ? 1 : 0, ...sx }}
    />
  );
};
