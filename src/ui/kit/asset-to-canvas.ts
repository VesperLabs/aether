import { assetToDataUrl } from "./image-tint";

interface AssetToCanvasArgs {
  asset: { src: string; previewRect?: readonly number[] };
  tint?: string;
  setImageData: (dataUrl: string) => void;
  shouldTrim?: boolean;
}

/**
 * Loads an asset's art into `setImageData`. Returns a cancel to call when the art is no longer
 * wanted (an effect's cleanup), so a slow load that finishes late can't overwrite newer art.
 */
export function assetToCanvas({ asset, tint, setImageData, shouldTrim = true }: AssetToCanvasArgs) {
  let live = true;
  assetToDataUrl(asset, tint, shouldTrim)
    .then((url) => live && setImageData(url))
    .catch((error) => {
      console.error("Error loading or processing image:", error);
    });
  return () => {
    live = false;
  };
}
