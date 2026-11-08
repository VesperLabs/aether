// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@/ui/kit/button/button";
import { activateNavFocus, setMenuMode, syncNavFocus } from "./pad-nav";

describe("A on a HUD button", () => {
  afterEach(() => setMenuMode(false));

  it("presses it once, as a mouse press would", () => {
    const onClick = vi.fn();
    render(
      <div data-modal="true">
        <Button onClick={onClick}>Login</Button>
      </div>,
    );
    const button = document.querySelector("[data-modal] > *") as HTMLElement;
    button.getBoundingClientRect = () => ({ left: 0, top: 0, width: 50, height: 20 }) as DOMRect;
    syncNavFocus();
    activateNavFocus();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
