import { DIRECTIONS } from "@/ui";
import { loadImage, saveSheet } from "./generations-api";
import { getSheetCell } from "./sheets";

/** Stand, three walk steps, then the right and left attacks, as every atlas names them. */
const COLUMNS = 6;

/**
 * Widens a sheet that stops short of its attack columns, filling each new frame with that row's
 * standing frame, to be redrawn. Anything below the four rows (a mob's item art) is kept as is.
 * Returns whether the sheet changed.
 */
export const addAttackColumns = async (src: string) => {
  /* The query skips the image cache: the sheet may have just been merged into. */
  const image = await loadImage(`${src}?fresh=${Date.now()}`);
  const cell = getSheetCell(src, image.height);
  const columns = Math.floor(image.width / cell);
  if (columns >= COLUMNS) return false;

  const canvas = document.createElement("canvas");
  canvas.width = cell * COLUMNS;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0);
  DIRECTIONS.forEach((_, row) => {
    for (let column = columns; column < COLUMNS; column++) {
      ctx.drawImage(image, 0, row * cell, cell, cell, column * cell, row * cell, cell, cell);
    }
  });
  await saveSheet(src, canvas);
  return true;
};
