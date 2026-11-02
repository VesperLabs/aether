/** Pixel-art flourishes for the top-left corner, one row per string: `#` is a pixel. */

/** The simplest flourish, for magic items: a bracket with a dot in the corner. */
const SIMPLE = ["#######", "#......", "#.#....", "#......", "#......", "#......", "#......"];

/** A plainer flourish for rare items: a bracket with a curl tucked inside. */
const PLAIN = [
  "###########",
  "#..........",
  "#.#####....",
  "#.#...#....",
  "#.#.#.#....",
  "#.#..##....",
  "#.#........",
  "#.#........",
  "#..........",
  "#..........",
  "#..........",
];

/**
 * The ornate flourish for unique and set items, mirrored across the diagonal: a double bracket
 * whose outer arms hook back in, with a hollow diamond in the corner.
 */
const ORNATE = [
  "###########..",
  "#..........#.",
  "#.#####.#..#.",
  "#.#......##..",
  "#.#..#.......",
  "#.#.#.#......",
  "#.#..#.......",
  "#............",
  "#.#..........",
  "#..#.........",
  "#..#.........",
  ".##..........",
  ".............",
];

/** One art pixel is one CSS pixel, the same weight as the border. */
const PIXEL = 1;

/** How far inside the border the flourish sits, clear of its rounded corner. */
const INSET = 3;

interface CornerProps {
  color: string;
  art: string[];
  flip?: boolean;
}

const Corner = ({ color, art, flip }: CornerProps) => (
  <svg
    width={art.length * PIXEL}
    height={art.length * PIXEL}
    shapeRendering="crispEdges"
    style={{
      position: "absolute",
      top: INSET,
      [flip ? "right" : "left"]: INSET,
      transform: flip ? "scaleX(-1)" : undefined,
      pointerEvents: "none",
    }}
  >
    {art.flatMap((row, y) =>
      [...row].map((cell, x) =>
        cell === "#" ? (
          <rect
            key={`${x},${y}`}
            x={x * PIXEL}
            y={y * PIXEL}
            width={PIXEL}
            height={PIXEL}
            fill={color}
          />
        ) : null,
      ),
    )}
  </svg>
);

/** The rarer the item, the prettier its flourish. */
const ART_BY_RARITY: Record<string, string[]> = {
  magic: SIMPLE,
  rare: PLAIN,
  unique: ORNATE,
  set: ORNATE,
};

/** Pixel flourishes inlaid in a gilded tooltip's top corners, set just inside its border. */
export const GildedCorners = ({ color, rarity }: { color: string; rarity: string }) => {
  const art = ART_BY_RARITY[rarity];
  if (!art) return null;
  return (
    <>
      <Corner color={color} art={art} />
      <Corner color={color} art={art} flip />
    </>
  );
};
