// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { pollGamepadButtons } from "./gamepad";
import { resetBindings } from "./key-bindings";
import { setMenusOpen } from "./last-device";

const pad = (down: number[], id = "Xbox Wireless Controller") => ({
  id,
  connected: true,
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })),
});

/** Presses then lets go of the buttons, returning the keys sent. */
function press(buttons: number[], id?: string) {
  const sent: string[] = [];
  const log = (e: KeyboardEvent) => sent.push(`${e.type}:${e.key}`);
  window.addEventListener("keydown", log);
  window.addEventListener("keyup", log);
  let current = pad(buttons, id);
  vi.stubGlobal("navigator", { getGamepads: () => [current] });
  pollGamepadButtons();
  current = pad([], id);
  pollGamepadButtons();
  window.removeEventListener("keydown", log);
  window.removeEventListener("keyup", log);
  return sent;
}

describe("gamepad buttons", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    resetBindings("gamepad");
    setMenusOpen(false);
    vi.restoreAllMocks();
  });

  it("does nothing in a window without focus, so another open tab can have the controller", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    expect(press([7])).toEqual([]);
  });

  it("lets go of a held button when the window loses focus", () => {
    const sent: string[] = [];
    const log = (e: KeyboardEvent) => sent.push(`${e.type}:${e.key}`);
    window.addEventListener("keydown", log);
    window.addEventListener("keyup", log);
    vi.stubGlobal("navigator", { getGamepads: () => [pad([7])] });
    pollGamepadButtons();
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    pollGamepadButtons();
    window.removeEventListener("keydown", log);
    window.removeEventListener("keyup", log);
    expect(sent).toEqual(["keydown: ", "keyup: "]);
  });

  it("attacks with RT and dashes with RB in play", () => {
    expect(press([7])).toEqual(["keydown: ", "keyup: "]);
    expect(press([5])).toEqual(["keydown:Shift", "keyup:Shift"]);
  });

  it("closes a modal with B, and A sends no key there", () => {
    document.body.innerHTML = `<div data-modal="true"></div>`;
    expect(press([0])).toEqual([]);
    expect(press([1])).toEqual(["keydown:Escape", "keyup:Escape"]);
  });

  it("confirms a modal with Start", () => {
    document.body.innerHTML = `<div data-modal="true"></div>`;
    expect(press([9])).toEqual(["keydown:Enter", "keyup:Enter"]);
  });

  it("closes side menus with B but still attacks", () => {
    setMenusOpen(true);
    expect(press([1])).toEqual(["keydown:Escape", "keyup:Escape"]);
    expect(press([7])).toEqual(["keydown: ", "keyup: "]);
  });

  it("steps tabs with the triggers in a modal", () => {
    document.body.innerHTML = `<div data-modal="true"></div>`;
    expect(press([6])).toEqual(["keydown:ArrowLeft", "keyup:ArrowLeft"]);
    expect(press([7])).toEqual(["keydown:ArrowRight", "keyup:ArrowRight"]);
  });

  it("reads a Nintendo pad's buttons by their letter", () => {
    document.body.innerHTML = `<div data-modal="true"></div>`;
    /* B sits at the bottom, which the browser numbers 0 */
    expect(press([0], "Pro Controller (Vendor: 057e)")).toEqual(["keydown:Escape", "keyup:Escape"]);
  });
});
