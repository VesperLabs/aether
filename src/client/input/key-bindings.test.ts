import { beforeEach, describe, expect, it } from "vitest";
import { bindButton, bindKey, getBindings, keyFor, resetBindings } from "./key-bindings";

describe("key bindings", () => {
  beforeEach(() => {
    resetBindings("keyboard");
    resetBindings("gamepad");
  });

  it("moves a key off the action that had it", () => {
    bindKey("attack", 0, "F");
    expect(keyFor("attack")).toBe("F");
    expect(getBindings().keyboard.grab).toEqual([null, null]);
    expect(keyFor("grab")).toBeUndefined();
  });

  it("falls back to the alternate key when the primary is cleared", () => {
    bindKey("moveUp", 0, null);
    expect(keyFor("moveUp")).toBe("ARROWUP");
  });

  it("moves a button off the action that had it", () => {
    bindButton("grab", { button: 0 });
    expect(getBindings().gamepad.grab).toEqual({ button: 0 });
    expect(getBindings().gamepad.talk).toBeNull();
  });

  it("keeps a combo apart from its buttons pressed alone", () => {
    bindButton("grab", { hold: 6, button: 0 });
    expect(getBindings().gamepad.talk).toEqual({ button: 0 });
  });

  it("resets one device without touching the other", () => {
    bindKey("attack", 0, "J");
    bindButton("attack", { button: 5 });
    resetBindings("keyboard");
    expect(keyFor("attack")).toBe("SPACE");
    expect(getBindings().gamepad.attack).toEqual({ button: 5 });
  });
});
