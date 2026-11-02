import { describe, expect, it } from "vitest";
import type { Pose } from "@/network/sync";
import { createInterpolator } from "./interpolation";

const tick = (t: number, x: number) => ({ t, p: [["a", x, 0, 0, 0, 1]] as Pose[], n: [] });

describe("createInterpolator", () => {
  it("blends between the two ticks around the render time", () => {
    const interp = createInterpolator(50);
    /* Ticks arrive exactly on time, so the delay settles toward one tick */
    for (let i = 0; i <= 40; i++) interp.add(tick(i * 50, i * 10), 1000 + i * 50);
    const frame = interp.sample(1000 + 40 * 50);
    const x = frame?.players.get("a")?.x ?? -1;
    expect(x).toBeGreaterThan(380);
    expect(x).toBeLessThan(400);
  });

  it("ignores ticks older than the newest", () => {
    const interp = createInterpolator(50);
    interp.add(tick(100, 1), 0);
    interp.add(tick(150, 2), 50);
    interp.add(tick(120, 99), 60);
    expect(interp.sample(1000)?.players.get("a")?.x).toBe(2);
  });

  it("needs two ticks before it can blend", () => {
    const interp = createInterpolator(50);
    interp.add(tick(0, 0), 0);
    expect(interp.sample(10)).toBeNull();
  });
});
