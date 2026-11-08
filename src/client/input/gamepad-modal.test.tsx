// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { KeyboardButton } from "@/ui/kit/keyboard-button";
import { Modal } from "@/ui/kit/modal";
import { pollGamepadButtons } from "./gamepad";

const pad = (down: number[]) => ({
  id: "Xbox",
  connected: true,
  axes: [0, 0],
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })),
});

describe("B in a modal", () => {
  it("clicks the Esc button", () => {
    const onClick = vi.fn();
    render(
      <Modal>
        <KeyboardButton keyboardKey="ESCAPE" onClick={onClick}>
          Close
        </KeyboardButton>
      </Modal>,
    );
    let current = pad([1]);
    vi.stubGlobal("navigator", { getGamepads: () => [current] });
    act(() => pollGamepadButtons());
    current = pad([]);
    act(() => pollGamepadButtons());
    expect(onClick).toHaveBeenCalled();
  });
});
