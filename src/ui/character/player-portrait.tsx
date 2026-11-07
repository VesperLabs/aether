import { useEffect, useState } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, trimCanvas } from "@/ui/kit";
import {
  drawLayers,
  getPlayerEquipmentAssets,
  MIN_CANVAS_SIZE,
  type RenderablePlayer,
} from "./player-render";
import { loadSheet } from "./sprite-sheet";

/**
 * The character standing, cut to its own pixels and scaled by a whole number so they stay even.
 * It takes exactly its own size, so it can sit on a floor without spilling past its box.
 */
export const PlayerPortrait = ({
  player,
  filteredSlots,
  scale = 3,
  shadow = false,
  sx,
}: {
  player?: RenderablePlayer;
  filteredSlots?: string[];
  scale?: number;
  /** Draws the shadow the character casts in the game. */
  shadow?: boolean;
  sx?: ThemeUIStyleObject;
}) => {
  const [art, setArt] = useState<{ url: string; width: number; height: number }>();
  const assets = getPlayerEquipmentAssets({ player, filteredSlots, shadow });
  const assetsKey = JSON.stringify(assets.map(({ src, tint, slotKey }) => [src, tint, slotKey]));

  useEffect(() => {
    let current = true;
    void Promise.all(assets.map(loadSheet)).then((layers) => {
      if (!current) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = MIN_CANVAS_SIZE;
      drawLayers(canvas, assets, layers);
      const trimmed = trimCanvas(canvas);
      setArt({ url: trimmed.toDataURL(), width: trimmed.width, height: trimmed.height });
    });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraws only when the layers change
  }, [assetsKey]);

  return (
    <Box
      as="img"
      {...{ src: art?.url, alt: "" }}
      sx={{
        display: "block",
        width: (art?.width ?? 0) * scale,
        height: (art?.height ?? 0) * scale,
        imageRendering: "pixelated",
        ...sx,
      }}
    />
  );
};
