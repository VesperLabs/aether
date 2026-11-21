import { assetList, getBody, shadowOf, shadowPixels } from "@/content";

type SheetAsset = (typeof assetList)[number];

/** A walk sheet's columns (stand, three steps, two attacks) and rows (one per facing). */
const COLUMNS = 6;
const ROWS = 4;

const SHEETS = new Map<string, SheetAsset | undefined>();

/** The sheet `race` is drawn from: its own texture, laid out on its atlas. */
const raceAsset = (race: string) => assetList.find(({ texture }) => texture === race);

/**
 * The shadow `race` casts in the game, as a sheet laid out like its own (same atlas and cells), so
 * previews draw it under any frame just like a body layer. Undefined for art with no walk sheet.
 */
export function getShadowSheet(race: string | undefined): SheetAsset | undefined {
  if (!race || typeof document === "undefined") return;
  if (SHEETS.has(race)) return SHEETS.get(race);
  const asset = raceAsset(race);
  const cell = Number(/(\d+)x\d+\.json$/.exec(asset?.atlas ?? "")?.[1] ?? 0);
  let sheet: SheetAsset | undefined;
  if (asset && cell) {
    const body = getBody(race);
    const shape = shadowOf(body);
    const oval = new ImageData(shadowPixels(shape), shape.width, shape.height);
    const canvas = document.createElement("canvas");
    canvas.width = cell * COLUMNS;
    canvas.height = cell * ROWS;
    const ctx = canvas.getContext("2d");
    /* Each cell's middle is the sprite's; the feet are `spriteAboveFeet` below it */
    const left = Math.round((cell - shape.width) / 2);
    const top = Math.round(cell / 2 + body.spriteAboveFeet + shape.below - shape.height / 2);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        ctx?.putImageData(oval, col * cell + left, row * cell + top);
      }
    }
    sheet = { ...asset, texture: `${race}-shadow`, src: canvas.toDataURL() } as SheetAsset;
  }
  SHEETS.set(race, sheet);
  return sheet;
}
