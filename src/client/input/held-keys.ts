import { getEventKeyName } from "@/ui/kit/keyboard-key";

/** When each held key went down, by `KeyboardKey` name, so rebound movement keys can be read. */
const held = new Map<string, number>();

let listening = false;

/** Starts tracking the keyboard. Safe to call more than once. */
export function trackHeldKeys() {
  if (listening) return;
  listening = true;
  window.addEventListener("keydown", (e) => {
    const name = getEventKeyName(e);
    if (!held.has(name)) held.set(name, performance.now());
  });
  window.addEventListener("keyup", (e) => held.delete(getEventKeyName(e)));
  /* Keys let go while the window is in the background never send a keyup */
  window.addEventListener("blur", () => held.clear());
}

/** When the key went down, or undefined when it's up. */
export const heldSince = (key: string | null) => (key ? held.get(key) : undefined);
