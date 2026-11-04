import { useEffect, useRef, useState } from "react";
import { assetList, type AssetDefinition } from "@/content";
import { Box } from "@/ui/kit";
import { loadSheet } from "./sprite-sheet";
import { ALL_WALK_POSES, getWalkFrameRect, useWalkCycle } from "./walk-cycle";

type Rect = { x: number; y: number; width: number; height: number };

/** The opaque area of one sheet cell, relative to the cell; undefined if the frame is blank. */
const measureFrame = (sheet: HTMLCanvasElement, [fx, fy, size]: number[]) => {
  const ctx = sheet.getContext("2d") as CanvasRenderingContext2D;
  const { data } = ctx.getImageData(fx, fy, size, size);
  let [left, top, right, bottom] = [size, size, -1, -1];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[(y * size + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? undefined : { left, top, right, bottom };
};

/**
 * One box every walk frame and the standing frame fit in, so the sprite neither shifts nor rescales
 * as it walks and turns. Undefined for a sheet with a blank walk frame: it stays standing.
 */
const measureWalk = (sheet: HTMLCanvasElement, cell: number) => {
  const rects = [
    [0, 2 * cell, cell, cell],
    ...ALL_WALK_POSES.map(({ direction, step }) => {
      return getWalkFrameRect(`${cell}x${cell}.json`, { direction, step }) as number[];
    }),
  ];
  const frames = rects.map((rect) => measureFrame(sheet, rect));
  if (frames.some((frame) => !frame)) return undefined;
  const opaque = frames as NonNullable<(typeof frames)[number]>[];
  const x = Math.min(...opaque.map((frame) => frame.left));
  const y = Math.min(...opaque.map((frame) => frame.top));
  return {
    x,
    y,
    width: Math.max(...opaque.map((frame) => frame.right)) - x + 1,
    height: Math.max(...opaque.map((frame) => frame.bottom)) - y + 1,
  } satisfies Rect;
};

const SHADOW_ASSET = assetList.find(({ texture }) => texture === "shadow");
const SHADOW_CELL = 80;

/** The smallest box around both. */
const unionRects = (a: Rect, b: Rect) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/** A whole-sheet sprite for a mob or keeper: stands facing the viewer, walks while `walking`. */
export const WalkingSprite = ({
  asset,
  tint,
  size = 80,
  walking = false,
  shadow = false,
}: {
  asset: AssetDefinition;
  tint?: string;
  size?: number;
  walking?: boolean;
  /** Draws the shadow the character casts in the game. */
  shadow?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<{
    sheet: HTMLCanvasElement;
    bounds: Rect;
    standBounds: Rect;
    canWalk: boolean;
    shadowSheet?: HTMLCanvasElement | null;
  }>();
  const pose = useWalkCycle(walking);
  const [, , cell] = getWalkFrameRect(asset.atlas, { direction: "down", step: 0 }) ?? [];

  useEffect(() => {
    let live = true;
    const loadingShadow = shadow && SHADOW_ASSET ? loadSheet(SHADOW_ASSET) : null;
    Promise.all([loadSheet({ src: asset.src, tint }), loadingShadow]).then(
      ([sheet, shadowSheet]) => {
        if (!live || !sheet || !cell) return;
        const walkBounds = measureWalk(sheet, cell);
        const canWalk = !!walkBounds;
        const fullCell = { x: 0, y: 0, width: cell, height: cell };
        const bodyBounds = walkBounds ?? fullCell;
        const stand = measureFrame(sheet, [0, 2 * cell, cell, cell]);
        const standBounds = stand
          ? {
              x: stand.left,
              y: stand.top,
              width: stand.right - stand.left + 1,
              height: stand.bottom - stand.top + 1,
            }
          : fullCell;
        const shadowBounds = shadowSheet && measureWalk(shadowSheet, SHADOW_CELL);
        /* Both sheets' cells share a centre in the game */
        const inset = (cell - SHADOW_CELL) / 2;
        const bounds = shadowBounds
          ? unionRects(bodyBounds, {
              ...shadowBounds,
              x: shadowBounds.x + inset,
              y: shadowBounds.y + inset,
            })
          : bodyBounds;
        setArt({ sheet, canWalk, bounds, standBounds, shadowSheet });
      },
    );
    return () => {
      live = false;
    };
  }, [asset.src, tint, cell, shadow]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !art || !cell) return;
    const { sheet, bounds, canWalk, shadowSheet } = art;
    const walkPose = canWalk ? pose : undefined;
    const { x, y, width, height } = bounds;
    ctx.clearRect(0, 0, width, height);
    if (shadowSheet) {
      const [sx, sy] = (walkPose && getWalkFrameRect(SHADOW_ASSET?.atlas, walkPose)) ?? [
        0,
        2 * SHADOW_CELL,
      ];
      const inset = (cell - SHADOW_CELL) / 2;
      ctx.drawImage(
        shadowSheet,
        sx,
        sy,
        SHADOW_CELL,
        SHADOW_CELL,
        inset - x,
        inset - y,
        SHADOW_CELL,
        SHADOW_CELL,
      );
    }
    const [sx, sy] = (walkPose && getWalkFrameRect(asset.atlas, walkPose)) ?? [0, 2 * cell];
    ctx.drawImage(sheet, sx, sy, cell, cell, -x, -y, cell, cell);
  }, [art, pose, asset.atlas, cell]);

  if (!art) return null;
  const { bounds, standBounds } = art;
  const { width, height } = bounds;
  /* Sized by the standing frame alone: wider walk frames and the shadow spill past it, so neither
     shrinks the character.
     Pixel art only stays even at whole-number scales; art bigger than the box shrinks smoothly. */
  const longest = Math.max(standBounds.width, standBounds.height);
  const scale = longest > size ? size / longest : Math.floor(size / longest);
  return (
    <Box
      as="canvas"
      ref={canvasRef}
      {...{ width, height }}
      sx={{
        display: "block",
        flexShrink: 0,
        width: width * scale,
        height: height * scale,
        /* In px: theme-ui reads a bare number here as a step on its spacing scale */
        marginLeft: `${(bounds.x - standBounds.x) * scale}px`,
        marginTop: `${(bounds.y - standBounds.y) * scale}px`,
        marginRight: `${(standBounds.x + standBounds.width - bounds.x - width) * scale}px`,
        marginBottom: `${(standBounds.y + standBounds.height - bounds.y - height) * scale}px`,
        imageRendering: scale >= 1 ? "pixelated" : "auto",
      }}
    />
  );
};
