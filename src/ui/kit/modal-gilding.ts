import type { ThemeUIStyleObject } from "theme-ui";

/** How far the jewellery reaches past the panel's edge. */
const OVERHANG = 8;
const SIZE = 96;
const CENTER = SIZE / 2;

const BORDER = "#000";
const GOLD = "#c8962e";
const LIGHT = "#f4d774";

/* Twice the panel's border, centred on the shape's edge: 1px shows outside it. */
const OUTLINE_WIDTH = 2;

/* All drawn for the top left corner; y = OVERHANG is the panel's outer edge. */

/* One L-shaped rail that runs into the panel's inset highlight, the row inside its border. */
const RAIL = "M92 9 L12 8 Q8 8 8 12 L9 92 H10 L10 12 Q10 10 12 10 L92 10 Z";
const RAIL_SHINE = "M62 9.5 L12 8.6 Q8.6 8.6 8.6 12 L9.5 62 L9.2 12 Q9.2 9.2 12 9.2 Z";
/* A constant 1px band: the border itself at the tips, lifting off it to carry round the gold. */
const RAIL_OUTLINE = "M92 8 L12 7 Q7 7 7 12 L8 92 H9 L9 12 Q9 9 12 9 L92 9 Z";

/* Each edge's vine: its undulating outer edge, the sprigs off it, and a highlight along it. Drawn
   for the top; the two are different growths, so the corner never looks mirrored. */
const TOP_VINE = {
  edge: "M9 5.6 C13 4.6 17 7 22 6.6 C27 6.2 30 4.8 35 5.6 C40 6.4 43 7.4 48 7 C52 6.7 56 7.3 62 8",
  sprigs: [
    "M29 5.8 C29 3.6 32 2.6 34.5 3.2 C32.8 3.7 31.6 4.6 31.8 5.8 Z",
    "M46 7.3 C46.5 5.6 49 5 50.8 5.4 C49.2 5.8 48.4 6.3 48.4 7.3 Z",
  ],
  shine: "M12 6 C16 5.6 18 7.5 22 7.2 C27 6.8 30 5.6 35 6.3 C39 6.8 42 7.8 47 7.6",
};
const LEFT_VINE = {
  edge: "M9 5.8 C14 5.4 18 4.8 24 5.6 C29 6.3 32 7.4 37 7 C42 6.6 46 5.8 50 6.6 C54 7.2 58 7.4 62 8",
  sprigs: [
    "M20 5.5 C20.5 3.4 23.4 2.4 26 3 C24.2 3.5 23 4.4 23 5.6 Z",
    "M41 6.6 C41.6 4.8 44 4 46 4.5 C44.4 5 43.4 5.6 43.4 6.4 Z",
  ],
  shine: "M12 6.3 C16 6 19 5.7 24 6.3 C29 7 32 8 37 7.7 C41 7.3 45 6.7 49 7.2",
};
const FLIP = "matrix(0 1 1 0 0 0)";
type Vine = typeof TOP_VINE;

/* Closed along the edge for its outline, and into the rail for its gold, which hides the join. */
const OUTLINE_BASE = 8;
const GOLD_BASE = 9.4;
const vineBody = (vine: Vine, base: number) => `${vine.edge} L9 ${base} Z`;

const vineOutline = (vine: Vine) =>
  [vineBody(vine, OUTLINE_BASE), ...vine.sprigs]
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${BORDER}" stroke-width="${OUTLINE_WIDTH}" ` +
        `stroke-linejoin="round"/>`,
    )
    .join("");

const vineGold = (vine: Vine) =>
  [vineBody(vine, GOLD_BASE), ...vine.sprigs]
    .map((d) => `<path d="${d}" fill="${GOLD}"/>`)
    .join("") +
  `<path d="${vine.shine}" fill="none" stroke="${LIGHT}" stroke-width="0.5" stroke-linecap="round"/>`;

/* A solid volute curling out of the corner where the vines meet: broad where it leaves the rail,
   tapering to nothing at its heart. */
const SWIRL_X = 7;
const SWIRL_Y = 7;
const SWIRL_RADIUS = 4.2;
const SWIRL_TURNS = 2;
/* How far in it winds, as a fraction of its radius. */
const SWIRL_WIND = 0.86;
const SWIRL_BAND = 1.1;
const SWIRL_SHINE_END = 0.7;
const SWIRL_STEPS = 64;
/* Fills the spiral's gaps, which would otherwise show the black outline behind them. */
const SWIRL_RECESS = "#8a6220";

const swirlPoint = (t: number, offset: number) => {
  const angle = Math.PI / 4 - t * SWIRL_TURNS * 2 * Math.PI;
  const r = SWIRL_RADIUS * (1 - SWIRL_WIND * t) + offset;
  return `${(SWIRL_X + r * Math.cos(angle)).toFixed(2)} ${(SWIRL_Y + r * Math.sin(angle)).toFixed(2)}`;
};

const swirlSteps = Array.from({ length: SWIRL_STEPS + 1 }, (_, i) => i / SWIRL_STEPS);
const swirlBand = (t: number) => SWIRL_BAND * (1 - t) ** 0.8;
const SWIRL_SHAPE = `M${[
  ...swirlSteps.map((t) => swirlPoint(t, swirlBand(t))),
  ...swirlSteps.map((t) => swirlPoint(t, -swirlBand(t))).reverse(),
].join(" L")} Z`;
const SWIRL_SHINE = `M${swirlSteps
  .filter((t) => t <= SWIRL_SHINE_END)
  .map((t) => swirlPoint(t, 0))
  .join(" L")}`;

const SWIRL = [
  `<path d="${SWIRL_SHAPE}" fill="${BORDER}" stroke="${BORDER}" ` +
    `stroke-width="${OUTLINE_WIDTH}" stroke-linejoin="round"/>`,
  `<circle cx="${SWIRL_X}" cy="${SWIRL_Y}" r="${SWIRL_RADIUS}" fill="${SWIRL_RECESS}"/>`,
  `<path d="${SWIRL_SHAPE}" fill="${GOLD}"/>`,
  `<path d="${SWIRL_SHINE}" fill="none" stroke="${LIGHT}" stroke-width="0.5" ` +
    `stroke-linecap="round"/>`,
].join("");

/* Solid at the corner, then the highlight shows through as the band fades along each edge. */
const GOLD_FADE =
  `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="9" cy="9" r="83">` +
  `<stop offset=".4" stop-color="${GOLD}"/>` +
  `<stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>`;

const onBothEdges = (draw: (vine: Vine) => string) =>
  `${draw(TOP_VINE)}<g transform="${FLIP}">${draw(LEFT_VINE)}</g>`;

/* Every outline before any gold, so the pieces join with no line across them. */
const ART = [
  `<defs>${GOLD_FADE}</defs>`,
  `<path d="${RAIL_OUTLINE}" fill="${BORDER}"/>`,
  onBothEdges(vineOutline),
  onBothEdges(vineGold),
  `<path d="${RAIL}" fill="url(#g)"/>`,
  `<path d="${RAIL_SHINE}" fill="${LIGHT}"/>`,
  SWIRL,
].join("");

const cornerImage = (degrees: number) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<g transform="rotate(${degrees} ${CENTER} ${CENTER})">${ART}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const CORNERS = [
  `${cornerImage(0)} top left`,
  `${cornerImage(90)} top right`,
  `${cornerImage(180)} bottom right`,
  `${cornerImage(270)} bottom left`,
];

/**
 * Gold jewellery on a panel's corners: a swirl with vines along the edges. The negative z-index
 * puts it over the panel's background but under its content, which needs the panel to be a stacking
 * context (Modal's transform makes it one).
 */
export const GILDED_CORNERS: ThemeUIStyleObject = {
  "&::after": {
    content: '""',
    position: "absolute",
    inset: `${-1 - OVERHANG}px`,
    zIndex: -1,
    pointerEvents: "none",
    background: CORNERS.map((corner) => `${corner} / ${SIZE}px ${SIZE}px no-repeat`).join(", "),
  },
};
