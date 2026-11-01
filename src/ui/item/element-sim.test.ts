import { describe, expect, it } from "vitest";
import { ELEMENT_EFFECTS, ELEMENT_TURN_MS } from "./element-effects";
import { ElementSim } from "./element-sim";

/** A diagonal blade pointing up-left from a grip at the origin. */
const BLADE = Array.from({ length: 20 }, (_, i) => ({ x: -i - 5, y: -i - 5 }));
const identity = (pixel: { x: number; y: number }) => pixel;

function run(sim: ElementSim, ms: number) {
  for (let time = 16; time <= ms; time += 16) sim.step(time, 16, identity);
}

describe("ElementSim", () => {
  it("gives off fire particles from the blade that stay close to it", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.fire]);
    sim.setBlade(BLADE, { x: 0, y: 0 });
    run(sim, 500);
    expect(sim.particles.length).toBeGreaterThan(0);
    for (const pixel of sim.pixels(identity)) {
      expect(pixel.x).toBeGreaterThan(-35);
      expect(pixel.y).toBeGreaterThan(-35);
      expect(pixel.x).toBeLessThan(5);
    }
  });

  it("gives off nothing without a blade", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.fire]);
    run(sim, 500);
    expect(sim.pixels(identity)).toEqual([]);
  });

  it("lets several elements take turns", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.fire, ELEMENT_EFFECTS.water]);
    const turns = new Set<number>();
    for (let time = 0; time < ELEMENT_TURN_MS * 4; time += ELEMENT_TURN_MS / 2) {
      sim.step(time, 16, identity);
      turns.add(sim.turn);
    }
    expect(turns).toEqual(new Set([0, 1]));
  });

  it("draws vines and no loose debris for earth", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.earth]);
    sim.setBlade(BLADE, { x: 0, y: 0 });
    run(sim, 500);
    expect(sim.particles).toEqual([]);
    expect(sim.pixels(identity).length).toBeGreaterThan(0);
  });
});
