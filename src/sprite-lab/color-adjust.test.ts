import { describe, expect, it } from "vitest";
import { adjustColors, NO_ADJUSTMENT } from "./color-adjust";

const image = (...pixels: number[][]) => ({
  data: new Uint8ClampedArray(pixels.flat()),
  width: pixels.length,
  height: 1,
});

describe("color adjust", () => {
  it("changes nothing at zero", () => {
    const picture = image([12, 200, 90, 255]);
    adjustColors(picture, NO_ADJUSTMENT);
    expect([...picture.data]).toEqual([12, 200, 90, 255]);
  });

  it("adds brightness straight onto every channel, clipping at the ends", () => {
    const picture = image([10, 100, 250, 255]);
    adjustColors(picture, { ...NO_ADJUSTMENT, brightness: 20 });
    expect([...picture.data]).toEqual([30, 120, 255, 255]);
  });

  it("flattens to gray at -100 contrast and spreads from mid-gray above zero", () => {
    const flat = image([0, 255, 100, 255]);
    adjustColors(flat, { ...NO_ADJUSTMENT, contrast: -100 });
    expect([...flat.data]).toEqual([128, 128, 128, 255]);

    const spread = image([100, 155, 128, 255]);
    adjustColors(spread, { ...NO_ADJUSTMENT, contrast: 50 });
    expect([...spread.data]).toEqual([72, 182, 128, 255]);
  });

  it("drains colour at -100 saturation and leaves grays alone when raising it", () => {
    const drained = image([200, 100, 100, 255]);
    adjustColors(drained, { ...NO_ADJUSTMENT, saturation: -100 });
    expect([...drained.data]).toEqual([150, 150, 150, 255]);

    const gray = image([90, 90, 90, 255]);
    adjustColors(gray, { ...NO_ADJUSTMENT, saturation: 100 });
    expect([...gray.data]).toEqual([90, 90, 90, 255]);
  });

  it("touches only the rect, and never clear pixels", () => {
    const picture = image([10, 10, 10, 255], [10, 10, 10, 255], [10, 10, 10, 0]);
    adjustColors(picture, { ...NO_ADJUSTMENT, brightness: 5 }, { x: 1, y: 0, width: 5, height: 1 });
    expect([...picture.data]).toEqual([10, 10, 10, 255, 15, 15, 15, 255, 10, 10, 10, 0]);
  });
});
