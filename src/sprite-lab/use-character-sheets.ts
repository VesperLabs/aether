import { useMemo } from "react";
import { ANIMATED_SHEETS, HUMAN_LAYERS, parseLook, type HumanLayer } from "./sheets";

/**
 * The body and worn layers as sheets, from their picks (`texture` or `texture|tint`). Tints are
 * for viewing: these sheets show them, so never edit or merge into one; look the plain sheet up
 * by its `src` instead.
 */
export const useCharacterSheets = (atlas: string, textures: Record<HumanLayer, string>) => {
  const { texture: baseTexture, tint: skinTint } = parseLook(atlas);
  const base = useMemo(() => {
    const plain = ANIMATED_SHEETS.find(({ texture }) => texture === baseTexture);
    return plain && { ...plain, tint: skinTint };
  }, [baseTexture, skinTint]);

  /* Layers are cut to the human body; they'd sit wrong on anything else. */
  const isHuman = baseTexture === "human";
  const layers = useMemo(
    () =>
      HUMAN_LAYERS.flatMap((layer) => {
        const { texture, tint } = parseLook(textures[layer]);
        const sheet = ANIMATED_SHEETS.find((option) => option.texture === texture);
        return isHuman && sheet ? [{ layer, sheet: { ...sheet, tint } }] : [];
      }),
    [textures, isHuman],
  );

  return { baseTexture, base, layers, isHuman };
};
