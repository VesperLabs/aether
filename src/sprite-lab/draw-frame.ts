import { DIRECTIONS } from "@/ui";
import { paintHandLabels, type HandLabel } from "./hand-guide";
import type { Frame } from "./lab-state";
import { getPalette, matchHeight, matchShading, removeBody, snapToPalette, toCell } from "./pixels";

/** Models handle tiny art badly, so they get it blown up and hand it back at any size. */
const UPSCALE = 8;
/** Four frames sit side by side, so each gets less room than a lone one. */
const VIEWS_UPSCALE = 4;
const BACKDROP = "#ff00ff";

const newCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
};

const loadPng = (base64: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gemini's image would not load"));
    image.src = `data:image/png;base64,${base64}`;
  });

/** The frame enlarged on the backdrop, as base64 PNG. */
const encodeFrame = (sheet: HTMLCanvasElement, { column, row }: Frame, cell: number) => {
  const size = cell * UPSCALE;
  const { canvas, ctx } = newCanvas(size, size);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(sheet, column * cell, row * cell, cell, cell, 0, 0, size, size);
  return canvas.toDataURL("image/png").split(",")[1];
};

/** A sheet's four standing frames in a row, in `DIRECTIONS` order, as base64 PNG. */
const encodeViews = (sheet: HTMLCanvasElement, cell: number) => {
  const size = cell * VIEWS_UPSCALE;
  const { canvas, ctx } = newCanvas(size * DIRECTIONS.length, size);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, canvas.width, size);
  DIRECTIONS.forEach((_, row) => {
    ctx.drawImage(sheet, 0, row * cell, cell, cell, row * size, 0, size, size);
  });
  return canvas.toDataURL("image/png").split(",")[1];
};

/** The body again with its hands marked, enlarged first so the labels stay sharp. */
const encodeHandGuide = (body: HTMLCanvasElement, hands: HandLabel[], cell: number) => {
  const size = cell * UPSCALE;
  const { canvas, ctx } = newCanvas(size, size);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(body, 0, 0, size, size);
  paintHandLabels(ctx, hands, UPSCALE);
  return canvas.toDataURL("image/png").split(",")[1];
};

/** The images a draw sends, in order, as base64 PNG. Previews show these same bytes. */
export const encodeDrawImages = (
  start: HTMLCanvasElement,
  startFrame: Frame,
  cell: number,
  wornViews?: HTMLCanvasElement,
  fitBody?: HTMLCanvasElement,
  hands?: HandLabel[],
) => [
  encodeFrame(start, startFrame, cell),
  ...(wornViews ? [encodeViews(wornViews, cell)] : []),
  ...(fitBody ? [encodeFrame(fitBody, { column: 0, row: 0 }, cell)] : []),
  ...(fitBody && hands ? [encodeHandGuide(fitBody, hands, cell)] : []),
];

/**
 * Asks Gemini to redraw one sheet's frame, then fixes what matters: the art spans the original's
 * rows and sits centred on it, at whatever width that gives, in only the sheet's colours. A wearable
 * takes its colours and overall shading from the design it copies.
 */
export const drawFrame = async ({
  target,
  frame,
  source,
  views,
  wornViews,
  fitBody,
  hands,
  cell,
  model,
  prompt,
}: {
  target: HTMLCanvasElement;
  frame: Frame;
  /** A saved draw of this one frame to work from, in place of the sheet's own. */
  source?: HTMLCanvasElement;
  /** The design being copied, which sets a wearable's colours and shading. */
  views?: HTMLCanvasElement;
  /** That design on the body, one standing frame per row: the example sent to the model. */
  wornViews?: HTMLCanvasElement;
  /** The body to dress, sent last: the reply wears the clothing on it, and the body comes off. */
  fitBody?: HTMLCanvasElement;
  /** Marks on a copy of the body, sent after it. The reply lines up on the clean one. */
  hands?: HandLabel[];
  cell: number;
  model: string;
  prompt: string;
}) => {
  const images = encodeDrawImages(
    source ?? target,
    source ? { column: 0, row: 0 } : frame,
    cell,
    wornViews,
    fitBody,
    hands,
  );
  const response = await fetch("/api/draw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, images }),
  });
  const { image, error } = await response.json();
  if (error) throw new Error(error);

  const drawn = await loadPng(image);
  const { ctx: fullCtx } = newCanvas(drawn.width, drawn.height);
  fullCtx.drawImage(drawn, 0, 0);
  const reply = fullCtx.getImageData(0, 0, drawn.width, drawn.height);

  const targetCtx = target.getContext("2d") as CanvasRenderingContext2D;
  /* Lined up with what was sent, which may stand taller than the sheet's frame. */
  const original = source
    ? (source.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, cell, cell)
    : targetCtx.getImageData(frame.column * cell, frame.row * cell, cell, cell);
  const bodyToRemove = fitBody
    ? (fitBody.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, cell, cell)
    : undefined;
  /* A dressed character lines up on the body, the one thing whose size and place are known. */
  const cleaned = bodyToRemove
    ? removeBody(toCell(matchHeight(reply, bodyToRemove), cell), bodyToRemove)
    : toCell(matchHeight(reply, original), cell);
  /* A wearable copies its design, shades included, whatever sheet it lands on. */
  const colors = views ?? target;
  const colorsCtx = colors.getContext("2d") as CanvasRenderingContext2D;
  if (views) {
    matchShading(cleaned.data, colorsCtx.getImageData(0, frame.row * cell, cell, cell).data);
  }
  snapToPalette(
    cleaned.data,
    getPalette(colorsCtx.getImageData(0, 0, colors.width, colors.height).data),
  );
  const { canvas, ctx } = newCanvas(cell, cell);
  ctx.putImageData(new ImageData(cleaned.data as ImageDataArray, cell, cell), 0, 0);
  return canvas;
};
