import { useLayoutEffect, useState } from "react";
import { resolveAsset, type ItemLook } from "@/content";
import { assetToCanvas, Icon } from "@/ui";

const PREVIEW_USER = { profile: { race: "human", gender: "female" } };

interface Preview {
  src: string;
  width: number;
  height: number;
}

/**
 * A small icon of an item, drawn from its texture the same way inventory slots draw it. Small art
 * scales up by whole pixels so it stays crisp; art bigger than the box shrinks smoothly instead.
 */
export const ChatItemPreview = ({ look, size = 24 }: { look: ItemLook; size?: number }) => {
  const [preview, setPreview] = useState<Preview>();

  useLayoutEffect(() => {
    const asset = resolveAsset(look, PREVIEW_USER);
    if (!asset) return;
    assetToCanvas({
      asset,
      tint: look.tint,
      setImageData: (src: string) => {
        const img = new Image();
        img.onload = () => setPreview({ src, width: img.width, height: img.height });
        img.src = src;
      },
    });
  }, [look]);

  const longest = Math.max(preview?.width ?? 0, preview?.height ?? 0);
  const fits = longest > 0 && longest <= size;
  const scale = fits ? Math.floor(size / longest) : 1;

  return (
    <Icon
      icon={preview?.src}
      size={size}
      sx={{
        backgroundSize: fits
          ? `${preview!.width * scale}px ${preview!.height * scale}px`
          : "contain",
        imageRendering: fits ? "pixelated" : "auto",
      }}
    />
  );
};
