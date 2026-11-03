import { describe, expect, it } from "vitest";
import { decideBots, nextPollDelay, type AmbientState } from "./decide";

const policy = { count: 3, graceMs: 60_000 };

/** Runs `decideBots` over `[time, humans]` samples and returns the desired count after each. */
function replay(samples: [number, number | undefined][]) {
  let state: AmbientState = {};
  return samples.map(([now, humans]) => {
    const next = decideBots(state, humans, now, policy);
    state = next.state;
    return next.desired;
  });
}

describe("decideBots", () => {
  it("keeps bots out while nobody plays", () => {
    expect(
      replay([
        [0, 0],
        [10_000, 0],
      ]),
    ).toEqual([0, 0]);
  });

  it("brings bots in with the first human", () => {
    expect(
      replay([
        [0, 0],
        [10_000, 1],
        [20_000, 2],
      ]),
    ).toEqual([0, 3, 3]);
  });

  it("keeps bots for the grace period after the last human leaves, then drops them", () => {
    expect(
      replay([
        [0, 1],
        [10_000, 0],
        [59_999, 0],
        [60_000, 0],
        [80_000, 0],
      ]),
    ).toEqual([3, 3, 3, 0, 0]);
  });

  it("restarts the grace period when a human comes back", () => {
    expect(
      replay([
        [0, 1],
        [50_000, 0],
        [55_000, 1],
        [100_000, 0],
        [114_000, 0],
      ]),
    ).toEqual([3, 3, 3, 3, 3]);
  });

  it("drops bots at once when the server can't be reached", () => {
    expect(
      replay([
        [0, 1],
        [10_000, undefined],
        [20_000, 0],
      ]),
    ).toEqual([3, 0, 0]);
  });
});

describe("nextPollDelay", () => {
  it("backs off exponentially up to the cap", () => {
    expect([0, 1, 2, 3, 10].map((f) => nextPollDelay(f, 10_000, 60_000))).toEqual([
      10_000, 20_000, 40_000, 60_000, 60_000,
    ]);
  });
});
