import { describe, expect, it } from "vitest";
import { getEventKeyName } from "./keyboard-key";

describe("getEventKeyName", () => {
  it("names a digit by its key even with Shift held", () => {
    expect(getEventKeyName({ key: "!", code: "Digit1" })).toBe("1");
    expect(getEventKeyName({ key: "1", code: "Digit1" })).toBe("1");
  });

  it("names other keys by what they type", () => {
    expect(getEventKeyName({ key: "q", code: "KeyQ" })).toBe("Q");
    expect(getEventKeyName({ key: " ", code: "Space" })).toBe("SPACE");
    expect(getEventKeyName({ key: "Shift", code: "ShiftLeft" })).toBe("SHIFT");
  });
});
