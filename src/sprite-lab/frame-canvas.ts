import type { PixelRect } from "./frame-editing";

export const getCtx = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return ctx;
};

const newCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** A copy of one block of a canvas. */
export const cropArea = (source: HTMLCanvasElement, rect: PixelRect) => {
  const cropped = newCanvas(rect.width, rect.height);
  getCtx(cropped).drawImage(source, -rect.x, -rect.y);
  return cropped;
};

/** A mirrored copy of a canvas. */
export const flipCanvas = (source: HTMLCanvasElement, axis: "x" | "y") => {
  const flipped = newCanvas(source.width, source.height);
  const ctx = getCtx(flipped);
  ctx.translate(axis === "x" ? source.width : 0, axis === "y" ? source.height : 0);
  ctx.scale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1);
  ctx.drawImage(source, 0, 0);
  return flipped;
};

/** A copy of a canvas turned a quarter clockwise. */
export const rotateCanvas = (source: HTMLCanvasElement) => {
  const turned = newCanvas(source.height, source.width);
  const ctx = getCtx(turned);
  ctx.translate(source.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return turned;
};
