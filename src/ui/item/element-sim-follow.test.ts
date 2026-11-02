import { describe, expect, it } from "vitest";
import { ELEMENT_EFFECTS } from "./element-effects";
import { ElementSim } from "./element-sim";

/** A blade pointing straight up from a grip at the origin. */
const BLADE = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: -i - 5 }));
const grip = { x: 0, y: 0 };

const rotated = (angle: number) => (p: { x: number; y: number }) => ({
  x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
  y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
});
const moved = (dx: number) => (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y });

describe("ElementSim following the blade", () => {
  it("carries fresh particles round when the blade turns", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.holy]);
    sim.setBlade(BLADE, grip);
    for (let t = 16; t <= 200; t += 16) sim.step(t, 16, rotated(0));
    expect(sim.particles.length).toBeGreaterThan(0);
    // A quarter turn over a few frames: the blade now points right, so should most particles
    for (let i = 1; i <= 6; i++) sim.step(200 + i * 16, 16, rotated((Math.PI / 2) * (i / 6)));
    const toTheRight = sim.particles.filter((p) => p.x > 5).length;
    expect(toTheRight / sim.particles.length).toBeGreaterThan(0.5);
  });

  it("takes every particle along when the weapon jumps to the other hand", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.holy]);
    sim.setBlade(BLADE, grip);
    for (let t = 16; t <= 1000; t += 16) sim.step(t, 16, moved(0));
    const before = new Map(sim.particles.map((p) => [p, p.x]));
    sim.step(1016, 16, moved(40));
    const survivors = sim.particles.filter((p) => before.has(p));
    expect(survivors.length).toBeGreaterThan(0);
    for (const p of survivors) expect(p.x).toBeGreaterThan(before.get(p)! + 30);
  });

  it("takes particles along, unthrown, when the character turns and the blade flips", () => {
    const sim = new ElementSim([ELEMENT_EFFECTS.holy]);
    sim.setBlade(BLADE, grip);
    const flipped = (p: { x: number; y: number }) => ({ x: -p.x, y: -p.y });
    for (let t = 16; t <= 600; t += 16) sim.step(t, 16, rotated(0));
    sim.step(616, 16, flipped);
    sim.step(632, 16, flipped);
    expect(sim.particles.every((p) => Math.hypot(p.flingX, p.flingY) <= 120)).toBe(true);
    // The blade now points down: the particles came with it
    const below = sim.particles.filter((p) => p.y > 0).length;
    expect(below / sim.particles.length).toBeGreaterThan(0.8);
  });
});
