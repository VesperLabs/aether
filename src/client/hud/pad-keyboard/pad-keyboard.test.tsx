// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ThemeUIProvider } from "theme-ui";
import { theme } from "@/ui/kit/theme";
import type { Theme } from "theme-ui";
import { setLastDevice } from "@/client/input/last-device";
import { choosePadField } from "@/client/input/pad-keyboard-events";
import { activateNavFocus, setMenuMode, syncNavFocus, moveNavFocus } from "@/client/input/pad-nav";
import { pollGamepadButtons } from "@/client/input/gamepad";
import { PadKeyboard } from "./pad-keyboard";

describe("on-screen keyboard", () => {
  it("puts itself away on Select even with Hide highlighted", () => {
    setLastDevice("gamepad", "Xbox");
    render(
      <ThemeUIProvider theme={theme as Theme}>
        <input id="name" />
        <PadKeyboard />
      </ThemeUIProvider>,
    );
    const input = document.getElementById("name") as HTMLInputElement;
    /* As A on the field does */
    choosePadField(input);
    act(() => input.focus());
    const hide = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.startsWith("Hide"),
    );
    expect(hide).toBeTruthy();
    for (const el of document.querySelectorAll(
      "[data-pad-keyboard] button, [data-pad-keyboard] [role]",
    )) {
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 10 }) as DOMRect;
    }
    act(() => {
      syncNavFocus();
      moveNavFocus("left");
    });
    expect(document.querySelector("[data-pad-focus]")?.textContent).toMatch(/^Hide/);
    const pad = (down: number[]) => ({
      id: "Xbox",
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })),
    });
    let current = pad([8]);
    vi.stubGlobal("navigator", { getGamepads: () => [current] });
    act(() => pollGamepadButtons());
    current = pad([]);
    act(() => pollGamepadButtons());
    vi.unstubAllGlobals();
    expect(document.activeElement).not.toBe(input);
    setMenuMode(false);
  });

  it("puts itself away with A on Hide", () => {
    setLastDevice("gamepad", "Xbox");
    render(
      <ThemeUIProvider theme={theme as Theme}>
        <input id="name2" />
        <PadKeyboard />
      </ThemeUIProvider>,
    );
    const input = document.getElementById("name2") as HTMLInputElement;
    /* As A on the field does */
    choosePadField(input);
    act(() => input.focus());
    for (const el of document.querySelectorAll(
      "[data-pad-keyboard] button, [data-pad-keyboard] [role]",
    )) {
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 10 }) as DOMRect;
    }
    act(() => {
      syncNavFocus();
      moveNavFocus("left");
    });
    console.log("FOCUS", document.querySelector("[data-pad-focus]")?.outerHTML.slice(0, 120));
    act(() => activateNavFocus());
    expect(document.activeElement).not.toBe(input);
    setMenuMode(false);
  });

  it("stays shut for a field that took focus by itself", () => {
    setLastDevice("gamepad", "Xbox");
    render(
      <ThemeUIProvider theme={theme as Theme}>
        <input id="auto" />
        <PadKeyboard />
      </ThemeUIProvider>,
    );
    act(() => (document.getElementById("auto") as HTMLInputElement).focus());
    expect(document.querySelector("[data-pad-keyboard]")).toBeNull();
  });
});
