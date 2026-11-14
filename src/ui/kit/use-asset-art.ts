import { useLayoutEffect, useState } from "react";
import { assetToDataUrl } from "./image-tint";

interface ArtAsset {
  src: string;
  previewRect?: readonly number[];
}

/**
 * An asset's art as a data URL, or `undefined` until it has loaded. Only ever the art of the
 * asset asked for now: while new art loads, the old one is dropped, never shown in the new
 * one's place (a swapped item's slot would keep the last sprite, cut to the new one's frame).
 */
export function useAssetArt(
  asset: ArtAsset | null | undefined,
  tint?: string,
  shouldTrim = true,
): string | undefined {
  const key = asset ? `${asset.src}|${asset.previewRect?.join(",") ?? ""}|${tint ?? ""}` : "";
  const [art, setArt] = useState<{ key: string; url: string }>();
  useLayoutEffect(() => {
    if (!asset) return;
    let live = true;
    assetToDataUrl(asset, tint, shouldTrim)
      .then((url) => live && setArt({ key, url }))
      .catch((error) => console.error("Error loading or processing image:", error));
    return () => {
      live = false;
    };
    /* Keyed on the art, not the asset object, which callers rebuild every render */
  }, [key, shouldTrim]);
  return art && art.key === key ? art.url : undefined;
}
