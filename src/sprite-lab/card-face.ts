import { mixHex, theme } from "@/ui";
import { getCtx } from "./frame-canvas";

/** Where a face sits on a frame, in cell pixels: the top-left of a square the diamond fills. */
export type FaceRect = { x: number; y: number; size: number };

/** Every card is a diamond this many pixels across, as big as an item icon. */
export const CARD_SIZE = 32;
/** The rings in from the edge: black, then the 1px border, then a dark line. */
const RING_COUNT = 3;
/** The diamond window inside the rings. Every face is cut to exactly this, so it fills it. */
export const FACE_SIZE = CARD_SIZE - RING_COUNT * 2;

/**
 * The crops that scale to the window cleanly: 2x, 1x, or shrunk by a whole number, so every
 * pixel lands evenly. Anything between would double some pixels and not others.
 */
const FACE_SCALES = [2, 1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6];

/** The clean crop sizes that fit in a frame of `cell` pixels, smallest first. */
export const getFaceCrops = (cell: number) =>
  FACE_SCALES.map((scale) => FACE_SIZE / scale).filter((crop) => crop <= cell);

/** How much a crop is scaled to fill the window, written as a zoom: `2x`, `1x`, `1/2x`. */
export const formatFaceScale = (crop: number) =>
  crop <= FACE_SIZE ? `${FACE_SIZE / crop}x` : `1/${crop / FACE_SIZE}x`;

export type CardRarity = "common" | "magic" | "rare" | "unique" | "set";

/** A card's colours: its border, brighter tips, and the backdrop's glow in the middle and dark edge. */
type CardFrame = { border: string; corner: string; glow: string; shade: string };

/** How far the tips lighten toward white. */
const TIP_LIGHTEN = 0.5;
/** How dark the backdrop is in its middle and at its edge: kept low, so the glow is subtle. */
const GLOW_DARKEN = 0.45;
const SHADE_DARKEN = 0.95;

/**
 * The chrome of a card, from the theme's colour for each rarity, the same one item names and
 * tooltips use: that colour for the border, lighter for the tips, and a dim glow behind the face.
 */
export const CARD_FRAMES = Object.fromEntries(
  (["common", "magic", "rare", "unique", "set"] as const).map((rarity) => {
    const border = (theme.colors as unknown as Record<string, string>)[rarity];
    return [
      rarity,
      {
        border,
        corner: mixHex(border, "#ffffff", TIP_LIGHTEN),
        glow: mixHex(border, "#000000", GLOW_DARKEN),
        shade: mixHex(border, "#000000", SHADE_DARKEN),
      },
    ];
  }),
) as Record<CardRarity, CardFrame>;

export const CARD_RARITIES = Object.keys(CARD_FRAMES) as CardRarity[];

const EDGE_COLOR = "#000";
/** The line just inside the border, dark enough to set the face off but still see it through. */
const INNER_COLOR = "rgba(0, 0, 0, 0.55)";

/** Whether a pixel of a `size` square is inside the diamond that touches its four sides. */
export const isInDiamond = (x: number, y: number, size: number) =>
  Math.abs(x + 0.5 - size / 2) + Math.abs(y + 0.5 - size / 2) <= size / 2;

/** Whether a pixel is on the card. */
const isOnCard = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < CARD_SIZE && y < CARD_SIZE && isInDiamond(x, y, CARD_SIZE);

/** The face cut to the card's window, scaled from its crop, with everything outside the diamond clear. */
export const cutDiamond = (frame: HTMLCanvasElement, { x, y, size: crop }: FaceRect) => {
  const size = FACE_SIZE;
  const face = document.createElement("canvas");
  face.width = size;
  face.height = size;
  const ctx = getCtx(face);
  ctx.drawImage(frame, x, y, crop, crop, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      if (!isInDiamond(px, py, size)) pixels.data[(py * size + px) * 4 + 3] = 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return face;
};

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** How many pixels in from the card's edge each pixel is: 0 on the edge, -1 off the card. */
const getDepths = () => {
  const depths = new Array<number>(CARD_SIZE * CARD_SIZE).fill(-1);
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < CARD_SIZE && y < CARD_SIZE ? depths[y * CARD_SIZE + x] : -1;
  for (let depth = 0; depth < RING_COUNT; depth += 1) {
    for (let y = 0; y < CARD_SIZE; y += 1) {
      for (let x = 0; x < CARD_SIZE; x += 1) {
        if (!isOnCard(x, y) || depths[y * CARD_SIZE + x] >= 0) continue;
        const isNext = NEIGHBORS.some(([dx, dy]) =>
          depth === 0 ? !isOnCard(x + dx, y + dy) : at(x + dx, y + dy) === depth - 1,
        );
        if (isNext) depths[y * CARD_SIZE + x] = depth;
      }
    }
  }
  return depths;
};

const DEPTHS = getDepths();

/**
 * A card as it shows in the game: an item-sized diamond with the face filling the window in its
 * middle. The rings are drawn over the face, black outside, then a 1px border with
 * brighter tips, then a dark line. The face file itself is only the diamond; the rest is drawn
 * under and over it.
 */
export const paintCard = (
  ctx: CanvasRenderingContext2D,
  face: HTMLCanvasElement,
  rarity: CardRarity,
) => {
  const { border, corner, glow, shade } = CARD_FRAMES[rarity];
  const fill = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < CARD_SIZE; y += 1) {
    for (let x = 0; x < CARD_SIZE; x += 1) {
      if (!isOnCard(x, y)) continue;
      /* A smooth radial fade from the glow in the middle to the shade at the tips. */
      const reach = Math.hypot(x + 0.5 - CARD_SIZE / 2, y + 0.5 - CARD_SIZE / 2) / (CARD_SIZE / 2);
      fill(x, y, mixHex(glow, shade, Math.min(reach, 1)));
    }
  }
  ctx.drawImage(face, RING_COUNT, RING_COUNT);
  for (let y = 0; y < CARD_SIZE; y += 1) {
    for (let x = 0; x < CARD_SIZE; x += 1) {
      const depth = DEPTHS[y * CARD_SIZE + x];
      if (depth === 0) fill(x, y, EDGE_COLOR);
      if (depth === 1) {
        const isTip =
          Math.abs(x + 0.5 - CARD_SIZE / 2) <= 1 || Math.abs(y + 0.5 - CARD_SIZE / 2) <= 1;
        fill(x, y, isTip ? corner : border);
      }
      if (depth === RING_COUNT - 1) fill(x, y, INNER_COLOR);
    }
  }
};
