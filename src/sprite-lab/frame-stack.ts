import { useEffect, useState } from "react";
import { getLayerOrder } from "@/content";
import { DIRECTIONS, loadSheet } from "@/ui";
import type { Frame } from "./lab-state";
import { getSheetCell, type HumanLayer, type Sheet } from "./sheets";
import type { PendingCandidate } from "./use-pending-candidates";

/** One sheet in the character's stack; the atlas underneath counts as its skin. */
export type StackedSheet = { layer: HumanLayer | "skin"; src: string; image: HTMLCanvasElement };

/** Each direction stacks in its own order, as in the game. */
export const sortForDirection = <T extends { layer: string }>(
  direction: (typeof DIRECTIONS)[number],
  stack: T[],
) => {
  const order: string[] = getLayerOrder(direction);
  return [...stack].sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer));
};

/** The sheet as it would be with its open draws merged. The original is left untouched. */
export const withPending = (
  sheet: Sheet,
  image: HTMLCanvasElement,
  pending: PendingCandidate[],
) => {
  const own = pending.filter(({ generation }) => generation.src === sheet.src);
  if (!own.length) return image;
  const copy = document.createElement("canvas");
  copy.width = image.width;
  copy.height = image.height;
  const ctx = copy.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0);
  const cell = getSheetCell(sheet.src, image.height);
  own.forEach(({ generation: { frame }, image: drawn }) => {
    const [x, y] = [frame.column * cell, frame.row * cell];
    ctx.clearRect(x, y, cell, cell);
    ctx.drawImage(drawn, x, y);
  });
  return copy;
};

/** An empty canvas one frame in size. */
export const blankCanvas = (cell: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  return canvas;
};

/** One frame of a sheet on a canvas of its own. */
export const cropFrame = (sheet: HTMLCanvasElement, { column, row }: Frame, cell: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(sheet, -column * cell, -row * cell);
  return canvas;
};

/** One frame of the stack, with `drawTarget` painting the sheet being edited in its place. */
export const paintFrameStack = (
  ctx: CanvasRenderingContext2D,
  stack: StackedSheet[],
  { column, row }: Frame,
  cell: number,
  targetSrc: string,
  drawTarget: (ctx: CanvasRenderingContext2D) => void,
) => {
  sortForDirection(DIRECTIONS[row], stack).forEach(({ src, image }) => {
    if (src === targetSrc) drawTarget(ctx);
    else ctx.drawImage(image, column * cell, row * cell, cell, cell, 0, 0, cell, cell);
  });
};

/** Every sheet in the character, ready to paint. */
export const useFrameStack = (
  base: Sheet,
  layers: { layer: HumanLayer; sheet: Sheet }[],
  pending: PendingCandidate[],
) => {
  const [stack, setStack] = useState<StackedSheet[]>([]);

  useEffect(() => {
    let live = true;
    const sheets = [{ layer: "skin" as const, sheet: base }, ...layers];
    Promise.all(sheets.map(({ sheet }) => loadSheet(sheet))).then((images) => {
      if (!live) return;
      setStack(
        sheets.flatMap(({ layer, sheet }, i) => {
          const image = images[i];
          return image
            ? [{ layer, src: sheet.src, image: withPending(sheet, image, pending) }]
            : [];
        }),
      );
    });
    return () => {
      live = false;
    };
  }, [base, layers, pending]);

  return stack;
};
