import { describe, expect, test } from "vitest";
import { getRevealScroll } from "./keyboard-scroll";

describe("getRevealScroll", () => {
  const visible = { top: 0, bottom: 400 };

  test("leaves a field that already shows", () => {
    expect(getRevealScroll({ top: 100, bottom: 140 }, visible)).toBe(0);
  });

  test("scrolls a field up from under the keyboard, clear of it", () => {
    expect(getRevealScroll({ top: 500, bottom: 540 }, visible)).toBe(156);
  });

  test("scrolls back to a field above the screen", () => {
    expect(getRevealScroll({ top: -50, bottom: -10 }, visible)).toBe(-66);
  });
});
