import { OVERWRITTEN_MODEL } from "./draw-models";
import type { Frame } from "./lab-state";
import { getSheetCell, type Sheet } from "./sheets";

export interface Generation {
  id: string;
  createdAt: string;
  /** Set when the image is changed after saving, such as by flipping it. */
  updatedAt?: string;
  texture: string;
  src: string;
  frame: Frame;
  model: string;
  /** What was typed for this draw. */
  prompt: string;
  /** Everything sent to Gemini. Draws from before this was saved don't have it. */
  fullPrompt?: string;
}

const post = async (url: string, body: object) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
};

const toBase64 = (canvas: HTMLCanvasElement) => canvas.toDataURL("image/png").split(",")[1];

/* The version keeps a changed image from coming back out of the browser's cache. */
export const getGenerationUrl = ({ id, createdAt, updatedAt }: Generation) =>
  `/api/generations/${id}.png?v=${updatedAt ?? createdAt}`;

export const listGenerations = async (): Promise<Generation[]> => {
  const response = await fetch("/api/generations");
  return (await response.json()).generations;
};

export const saveGeneration = (
  canvas: HTMLCanvasElement,
  {
    sheet,
    ...meta
  }: { sheet: Sheet; frame: Frame; model: string; prompt: string; fullPrompt?: string },
) =>
  post("/api/generations", {
    ...meta,
    texture: sheet.texture,
    src: sheet.src,
    image: toBase64(canvas),
  });

export const deleteGeneration = ({ id }: Generation) =>
  fetch(`/api/generations/${id}`, { method: "DELETE" });

/** Copies a draw by id, so it's also a candidate for another frame of its sheet. */
export const copyGeneration = async (id: string, frame: Frame): Promise<Generation> => {
  const { generation } = await post(`/api/generations/${id}`, frame);
  return generation;
};

/** Saves a new image over a draw. */
export const replaceGenerationImage = async (
  { id }: Pick<Generation, "id">,
  canvas: HTMLCanvasElement,
): Promise<Generation> => {
  const response = await fetch(`/api/generations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: toBase64(canvas) }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.generation;
};

/** Mirrors a draw in place. Doing it again restores it. */
export const flipGeneration = async (
  generation: Generation,
  axis: "x" | "y",
): Promise<Generation> => {
  const image = await loadImage(getGenerationUrl(generation));
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.translate(axis === "x" ? image.width : 0, axis === "y" ? image.height : 0);
  ctx.scale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1);
  ctx.drawImage(image, 0, 0);
  return replaceGenerationImage(generation, canvas);
};

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

/** A saved draw on a canvas of its own, to compare or change. */
export const loadGenerationCanvas = async (generation: Generation, cell: number) => {
  const image = await loadImage(getGenerationUrl(generation));
  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(image, 0, 0);
  return canvas;
};

/** Moves a hand's weapon on one frame, in `weapon.json`. */
export const saveWeaponPose = (pose: { frame: string; hand: string; x: number; y: number }) =>
  post("/api/weapon-poses", pose);

/** Writes a whole sheet over its file. */
const saveSheet = (src: string, canvas: HTMLCanvasElement) =>
  post("/api/sheets", { src, image: toBase64(canvas) });

/** Saves what a merge is about to replace as a candidate, so it can be merged back. */
const keepOverwrittenFrame = async (
  { texture, src, frame }: Pick<Generation, "texture" | "src" | "frame">,
  pixels: ImageData,
) => {
  if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) return;
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  (canvas.getContext("2d") as CanvasRenderingContext2D).putImageData(pixels, 0, 0);
  await post("/api/generations", {
    texture,
    src,
    frame,
    model: OVERWRITTEN_MODEL,
    prompt: "",
    image: toBase64(canvas),
  });
};

/**
 * Shifts one frame of a sheet on disk, keeping what it replaces as a candidate. Art pushed past the
 * cell's edge is cut off; an empty frame is left alone.
 */
export const nudgeSheetFrame = async (sheet: Sheet, frame: Frame, dx: number, dy: number) => {
  const image = await loadImage(`${sheet.src}?fresh=${Date.now()}`);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0);
  const cell = getSheetCell(sheet.src, image.height);
  const [x, y] = [frame.column * cell, frame.row * cell];
  const pixels = ctx.getImageData(x, y, cell, cell);
  if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) return;
  await keepOverwrittenFrame({ ...sheet, frame }, pixels);
  ctx.clearRect(x, y, cell, cell);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, cell, cell);
  ctx.clip();
  ctx.drawImage(image, x, y, cell, cell, x + dx, y + dy, cell, cell);
  ctx.restore();
  await saveSheet(sheet.src, canvas);
};

/** Replaces the generation's cell in the sheet it came from, on disk. */
export const mergeGeneration = async (generation: Generation) => {
  /* The query skips the app's image cache: the sheet may have just been merged into. */
  const [sheet, cellImage] = await Promise.all([
    loadImage(`${generation.src}?fresh=${Date.now()}`),
    loadImage(getGenerationUrl(generation)),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const cell = getSheetCell(generation.src, sheet.height);
  const [x, y] = [generation.frame.column * cell, generation.frame.row * cell];
  ctx.drawImage(sheet, 0, 0);
  await keepOverwrittenFrame(generation, ctx.getImageData(x, y, cell, cell));
  ctx.clearRect(x, y, cell, cell);
  ctx.drawImage(cellImage, x, y);
  await saveSheet(generation.src, canvas);
};

/** Saves a finished card, and remembers where the sprite's face is. */
export const saveCard = (card: {
  name: string;
  texture: string;
  face: { x: number; y: number; size: number };
  image: HTMLCanvasElement;
}) => post("/api/cards", { ...card, image: toBase64(card.image) });
