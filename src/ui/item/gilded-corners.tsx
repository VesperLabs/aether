/**
 * Pixel-art flourishes for the top-left corner, one row per string (`#` is a pixel), each
 * mirrored across the diagonal. They get more detailed with rarity.
 */

/** Magic: a solid corner. */
const MAGIC = ["####.#.", "###....", "##.....", "#......", ".......", "#......", "......."];

/** Rare: the corner sprouts a curl. */
const RARE = [
  "#####.##.",
  "####.#..#",
  "###..#.#.",
  "##.......",
  "#........",
  ".##......",
  "#........",
  "#.#......",
  ".#.......",
];

/** Set: a double bracket whose outer arms hook back in, round a hollow diamond. */
const SET = [
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

/** Unique: twin spirals on each edge, trailing off in dots. */
const UNIQUE = [
  "#######.####.#.#",
  "######.##...#...",
  "#####..#.##.#...",
  "####...#..#.#...",
  "###.##..##..#...",
  "##..#.#....#....",
  "#....#..........",
  ".###............",
  "##..#...........",
  "#.#.#...........",
  "#.##............",
  "#....#..........",
  ".####...........",
  "#...............",
  "................",
  "#...............",
];

/** One art pixel is one CSS pixel, the same weight as the border. */
const PIXEL = 1;

/** How far inside the border the flourish sits, clear of its rounded corner. */
const INSET = 3;

interface CornerProps {
  color: string;
  art: string[];
  /** Mirror to the right-hand corner. */
  flipX?: boolean;
  /** Mirror to a bottom corner. */
  flipY?: boolean;
}

const Corner = ({ color, art, flipX, flipY }: CornerProps) => (
  <svg
    width={art.length * PIXEL}
    height={art.length * PIXEL}
    shapeRendering="crispEdges"
    style={{
      position: "absolute",
      [flipY ? "bottom" : "top"]: INSET,
      [flipX ? "right" : "left"]: INSET,
      transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
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

const ART_BY_RARITY: Record<string, string[]> = {
  magic: MAGIC,
  rare: RARE,
  set: SET,
  unique: UNIQUE,
};

/** Pixel flourishes inlaid in all four corners of a gilded tooltip, set just inside its border. */
export const GildedCorners = ({ color, rarity }: { color: string; rarity: string }) => {
  const art = ART_BY_RARITY[rarity];
  if (!art) return null;
  return (
    <>
      <Corner color={color} art={art} />
      <Corner color={color} art={art} flipX />
      <Corner color={color} art={art} flipY />
      <Corner color={color} art={art} flipX flipY />
    </>
  );
};
