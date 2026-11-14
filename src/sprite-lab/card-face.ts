import { mixHex } from "@/ui";
import { getCtx } from "./frame-canvas";

/** Where a face sits on a frame, in cell pixels: the top-left of a square the diamond fills, always `FACE_SIZE`. */
export type FaceRect = { x: number; y: number; size: number };

/**
 * Every card is a diamond this many pixels across. Item art draws at 2x in a 56px slot with a 1px
 * border, so 26px (52 on screen) leaves a 1px gap inside the border on every side.
 */
export const CARD_SIZE = 26;
/** The item icon frame a card is saved in, centred, so it loads like any other stackable. */
export const CARD_ICON_SIZE = 32;
/** The rings in from the edge: black, then the 1px bevel. */
const RING_COUNT = 2;
/** The diamond window inside the black edge. Every face is cut to exactly this, so it fills it. */
/** How far in the face starts: just inside the black edge, so the translucent bevel lies over it. */
const FACE_INSET = 1;
export const FACE_SIZE = CARD_SIZE - FACE_INSET * 2;

/** How the backdrop fades: above 1 the bright middle holds wider before dropping off at the tips. */
const FADE_CURVE = 1.8;
/** Every card's backdrop: night, a lit grey-blue where the light is, fading to a deep one at the tips. */
const CARD_BACKDROP = { glow: "#5a5a78", shade: "#1c1c2a" } as const;

const EDGE_COLOR = "#000";
/**
 * The bevel: warm light along the top edges and a cool bounce along the bottom, so it reads as
 * enamel rather than plastic. Each fades from its tip toward the side points, giving it curve.
 */
const TOP_LIGHT = "255, 236, 190";
const BOTTOM_LIGHT = "170, 210, 255";
const TOP_ALPHA = { tip: 0.5, side: 0.12 };
const BOTTOM_ALPHA = { tip: 0.4, side: 0.1 };
/** A crisp glint at the top tip: the two middle pixels brightest, the next ones out a little less. */
const GLINT = "rgba(255, 255, 255, 0.6)";
const GLINT_HALO = "rgba(255, 255, 255, 0.4)";

/** A bevel pixel's colour: by which half it's on, and how far it is from that half's tip. */
const getBevelColor = (x: number, y: number) => {
  const fromTip = Math.abs(x + 0.5 - CARD_SIZE / 2);
  const isTop = y < CARD_SIZE / 2;
  if (isTop && fromTip < 1) return GLINT;
  if (isTop && fromTip < 2) return GLINT_HALO;
  const { tip, side } = isTop ? TOP_ALPHA : BOTTOM_ALPHA;
  const alpha = tip + (side - tip) * Math.min(fromTip / (CARD_SIZE / 2), 1);
  return `rgba(${isTop ? TOP_LIGHT : BOTTOM_LIGHT}, ${alpha.toFixed(3)})`;
};

/** Whether a pixel of a `size` square is inside the diamond that touches its four sides. */
export const isInDiamond = (x: number, y: number, size: number) =>
  Math.abs(x + 0.5 - size / 2) + Math.abs(y + 0.5 - size / 2) <= size / 2;

/** Whether a pixel is on the card. */
const isOnCard = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < CARD_SIZE && y < CARD_SIZE && isInDiamond(x, y, CARD_SIZE);

/** The face cut 1:1 from the frame to the card's window, with everything outside the diamond clear. */
export const cutDiamond = (frame: HTMLCanvasElement, { x, y }: FaceRect) => {
  const size = FACE_SIZE;
  const face = document.createElement("canvas");
  face.width = size;
  face.height = size;
  const ctx = getCtx(face);
  ctx.drawImage(frame, x, y, size, size, 0, 0, size, size);
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
 * middle. The rings are drawn over the face: black outside, then a translucent 1px bevel, warm
 * along the top edges with a glint at the tip, and cool along the bottom. The face file itself is only the diamond; the rest is
 * drawn under and over it.
 */
export const paintCard = (ctx: CanvasRenderingContext2D, face: HTMLCanvasElement) => {
  const { glow, shade } = CARD_BACKDROP;
  const fill = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < CARD_SIZE; y += 1) {
    for (let x = 0; x < CARD_SIZE; x += 1) {
      if (!isOnCard(x, y)) continue;
      /* A smooth radial fade from the glow in the middle to the shade at the tips. */
      const reach = Math.hypot(x + 0.5 - CARD_SIZE / 2, y + 0.5 - CARD_SIZE / 2) / (CARD_SIZE / 2);
      fill(x, y, mixHex(glow, shade, Math.min(reach, 1) ** FADE_CURVE));
    }
  }
  ctx.drawImage(face, FACE_INSET, FACE_INSET);
  for (let y = 0; y < CARD_SIZE; y += 1) {
    for (let x = 0; x < CARD_SIZE; x += 1) {
      const depth = DEPTHS[y * CARD_SIZE + x];
      if (depth === 0) fill(x, y, EDGE_COLOR);
      /* Translucent over the face's outer pixels, so the face shows through the bevel. */
      if (depth === 1) fill(x, y, getBevelColor(x, y));
    }
  }
};
