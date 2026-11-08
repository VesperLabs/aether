import type { PadStyle } from "@/ui/kit/pad-glyph";
import { MODAL_ATTR } from "@/ui/kit/shake-modal";

/**
 * Whether the player last used the keyboard and mouse or a controller, so the HUD can show the
 * buttons for what's in their hands.
 */
export type InputDevice = "keyboard" | "gamepad";

let device: InputDevice = "keyboard";
let padId = "";
const listeners = new Set<() => void>();
let listening = false;

/** `id` names the controller, for its button labels. */
export function setLastDevice(next: InputDevice, id = padId) {
  if (next === device && id === padId) return;
  device = next;
  padId = id;
  for (const listener of listeners) listener();
}

export const getLastDevice = () => device;

let modalOpen = false;

/** Whether a modal is up, which turns the controller's confirm and back buttons into Enter and Esc. */
export const isModalOpen = () => modalOpen;

let menusOpen = false;

/** Whether a side menu (inventory, stats…) is open, which turns the controller's back button into Esc. */
export const areMenusOpen = () => menusOpen;

export function setMenusOpen(open: boolean) {
  menusOpen = open;
}

function setModalOpen(open: boolean) {
  if (open === modalOpen) return;
  modalOpen = open;
  for (const listener of listeners) listener();
}

/** Checks the page for a modal. Call once a frame, before reading input. */
export const syncModalOpen = () => setModalOpen(!!document.querySelector(`[${MODAL_ATTR}]`));

/**
 * Which family the last controller belongs to, from the name the browser gives it (which holds
 * its USB vendor id: 057e Nintendo, 054c Sony). Anything else is labelled like an Xbox pad.
 */
export const isNintendoPad = (id: string) => /057e|nintendo|pro controller|joy-con/i.test(id);

export function getPadStyle(): PadStyle {
  if (isNintendoPad(padId)) return "switch";
  if (/054c|playstation|dualshock|dualsense|wireless controller/i.test(padId)) return "playstation";
  return "xbox";
}

export function subscribeLastDevice(listener: () => void) {
  if (!listening && typeof window !== "undefined") {
    listening = true;
    /* Trusted only: the controller sends its own key events, which mustn't flip it back */
    const toKeyboard = (e: Event) => e.isTrusted && setLastDevice("keyboard");
    window.addEventListener("keydown", toKeyboard, true);
    window.addEventListener("mousedown", toKeyboard, true);
    window.addEventListener("gamepaddisconnected", () => setLastDevice("keyboard"));
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
