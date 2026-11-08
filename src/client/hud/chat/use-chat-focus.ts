import { useEffect, type RefObject } from "react";
import { getLastDevice } from "@/client/input/last-device";
import { choosePadField } from "@/client/input/pad-keyboard-events";

/** Where the chat box's focus goes while chat is open. `inputBox` holds its input. */
export function useChatFocus(tabChat: boolean, inputBox: RefObject<HTMLElement | null>) {
  /* Phaser cancels presses on the canvas, so clicking the game never blurs the input and the
   * hero ignores keys. Blur it by hand; Enter puts you back in the box while chat stays open. */
  useEffect(() => {
    if (!tabChat) return;
    const input = () => inputBox.current?.querySelector("input");
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof HTMLCanvasElement) input()?.blur();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const box = input();
      if (e.key !== "Enter" || !box || document.activeElement === box) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tabChat]);

  /* Opened with a controller: straight into typing, as the keyboard's Enter puts you in the
   * box, with the on-screen keyboard up (fields don't take focus by themselves on a pad) */
  useEffect(() => {
    if (!tabChat || getLastDevice() !== "gamepad") return;
    const frame = requestAnimationFrame(() => {
      typeInChat(inputBox);
    });
    return () => cancelAnimationFrame(frame);
  }, [tabChat]);
}

/** Puts the cursor in the chat box, with the on-screen keyboard up on a controller. */
function typeInChat(inputBox: RefObject<HTMLElement | null>) {
  const input = inputBox.current?.querySelector("input");
  if (!input) return;
  choosePadField(input);
  input.focus();
}

/**
 * Pressing the chat button while chat is open: on a controller that's the way back to typing
 * (B closes chat), so it does that and says so. With the mouse it closes chat as before.
 */
export function chatButtonTypes(tabChat: boolean, inputBox: RefObject<HTMLElement | null>) {
  if (!tabChat || getLastDevice() !== "gamepad") return false;
  typeInChat(inputBox);
  return true;
}
