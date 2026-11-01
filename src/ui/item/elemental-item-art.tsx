import { useLayoutEffect, useState } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { getPreviewGrip, type AssetDefinition } from "@/content";
import { assetToCanvas } from "@/ui/kit";
import { ElementalSprite } from "./elemental-sprite";

/** The size of a weapon's preview art: the `previewRect` cut out of its texture. */
export function previewSize(asset: AssetDefinition) {
  const [, , width, height] = asset.previewRect as readonly number[];
  return { width, height };
}

/**
 * A weapon's preview art with its elements' outline, particles, bolts and vines, the one way
 * items show them outside the game world (inventory slots, the wiki). Untrimmed, so the grip is
 * where the item list says, and effects come off the blade as they do in a player's hand.
 */
export const ElementalItemArt = ({
  asset,
  tint,
  elements,
  scale,
  layerSx,
}: {
  asset: AssetDefinition;
  tint?: string;
  elements: string[];
  scale: number;
  /** Places the art: see `ElementalSprite`. */
  layerSx?: ThemeUIStyleObject;
}) => {
  const [imageData, setImageData] = useState<string>();
  useLayoutEffect(() => {
    assetToCanvas({ asset, tint, setImageData, shouldTrim: false });
  }, [asset, tint]);
  if (!imageData) return null;
  const grip = getPreviewGrip(asset.previewRect as readonly number[]);
  return (
    <ElementalSprite
      src={imageData}
      {...previewSize(asset)}
      scale={scale}
      elements={elements}
      grip={grip}
      layerSx={layerSx}
    />
  );
};
