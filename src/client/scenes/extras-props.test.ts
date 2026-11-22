import { describe, expect, it } from "vitest";
import { findProps, propFoot, type CellAt, type ExtrasCell } from "./extras-props";

const o: ExtrasCell = { base: false };
const B: ExtrasCell = { base: true };
const _ = null;
const sorted = (props: CellAt[][]) =>
  props.map((prop) => [...prop].sort(([a, b], [c, d]) => a - c || b - d));

describe("findProps", () => {
  it("joins touching cells in any direction into one prop", () => {
    expect(
      sorted(
        findProps([
          [o, o, _],
          [_, o, _],
          [_, _, o],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      [[2, 2]],
    ]);
  });

  it("makes a base tile and the tiles stacked on it one prop, up to the next base", () => {
    expect(sorted(findProps([[o], [B], [o], [B]]))).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [3, 0],
      ],
    ]);
  });

  it("joins base tiles side by side in a row into one prop, like a tree flagged across its bottom", () => {
    expect(
      sorted(
        findProps([
          [o, o, o],
          [B, B, B],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    ]);
  });

  it("keeps a base tile marked alone out of the base row beside it, like a wall's corner", () => {
    const corner: ExtrasCell = { base: true, alone: true };
    expect(sorted(findProps([[corner, B, B]]))).toEqual([
      [[0, 0]],
      [
        [0, 1],
        [0, 2],
      ],
    ]);
  });

  it("takes the columns hanging beside a base, like a tree's leaves beside its trunk", () => {
    expect(
      sorted(
        findProps([
          [o, o, o],
          [_, B, _],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
      ],
    ]);
  });

  it("gives each hanging column to the nearest base, so touching trees stay apart", () => {
    expect(
      sorted(
        findProps([
          [o, o, o, o, o, o],
          [_, B, _, _, B, _],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
      ],
      [
        [0, 3],
        [0, 4],
        [0, 5],
        [1, 4],
      ],
    ]);
  });

  it("leaves a column standing beside a base on its own, like a bush by a fence", () => {
    expect(
      sorted(
        findProps([
          [o, o],
          [B, o],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0, 1],
        [1, 1],
      ],
    ]);
  });
});

describe("propFoot", () => {
  it("stands on the lowest solid pixel anywhere in the prop, so touching trees keep their trunks", () => {
    const twoTrees: CellAt[] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    const trunks = ([row]: CellAt) => (row === 1 ? 25 : 31);
    expect(propFoot(twoTrees, 32, trunks)).toBe(32 + 26);
  });

  it("skips tiles with nothing solid", () => {
    const stack: CellAt[] = [
      [0, 0],
      [1, 0],
    ];
    expect(propFoot(stack, 32, ([row]) => (row === 0 ? 20 : null))).toBe(21);
  });

  it("stands on its bottom edge when nothing is solid", () => {
    expect(propFoot([[2, 0]], 32, () => null)).toBe(96);
  });
});
