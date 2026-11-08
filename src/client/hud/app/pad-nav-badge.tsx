import { useEffect, useRef, useSyncExternalStore } from "react";
import { Box, PadCombo, Portal } from "@/ui";
import { getLastDevice, subscribeLastDevice } from "@/client/input/last-device";
import { NO_CORNER_BADGE, getNavBadge, onNavChange } from "@/client/input/pad-nav";
import { drawsOwnBadge, fieldBadgeHost } from "@/client/input/pad-highlight";
import { PAD_KEYBOARD_ATTR } from "@/client/input/pad-keyboard-events";

/** How far the menu buttons' key badges reach past their corner (`MenuButton`). */
const KEY_OVERHANG = 3;

/* Not on a slider, nor on the on-screen keyboard, whose keys draw their own */
const NO_BADGE = `${NO_CORNER_BADGE}, [${PAD_KEYBOARD_ATTR}]`;

/**
 * Moves the badge onto its target, or hides it. Written straight to the element, not through
 * React state, so it lands in the same frame as the highlight's outline.
 */
function place(box: HTMLElement) {
  const nav = getNavBadge();
  const target = nav?.target;
  /* The highlight draws a control's A with it (its own key badge, or beside it); this only
   * covers the rest, and Start where menu mode will come back to */
  const drawnWithIt = nav?.button === "A" && !!target && drawsOwnBadge(target);
  if (!nav || !target || target.closest(NO_BADGE) || drawnWithIt) {
    box.style.display = "none";
    return;
  }
  const r = target.getBoundingClientRect();
  /* The scale it's drawn at (the HUD's zoom, or 1 for a modal) */
  const width = (target as HTMLElement).offsetWidth;
  const scale = width ? r.width / width : 1;
  /* From inside the border, where a key badge's corner is measured from */
  const style = getComputedStyle(target);
  const right = r.right - (parseFloat(style.borderRightWidth) || 0) * scale;
  const bottom = r.bottom - (parseFloat(style.borderBottomWidth) || 0) * scale;
  box.style.display = "block";
  box.style.left = `${Math.round(right + KEY_OVERHANG * scale)}px`;
  box.style.top = `${Math.round(bottom + KEY_OVERHANG * scale)}px`;
  /* Placed as the key badges are: its bottom-right just past the corner, at the HUD's size */
  box.style.transform = `translate(-100%, -100%) scale(${scale})`;
  box.dataset.button = nav.button;
}

/**
 * The controller button that acts on the menus, on the bottom-right corner of what it acts on,
 * like the key badges: A on the highlight, or Start on where menu mode left off.
 */
export const PadNavBadge = () => {
  const device = useSyncExternalStore(subscribeLastDevice, getLastDevice);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (device !== "gamepad" || !box) return;
    const update = () => place(box);
    update();
    const stop = onNavChange(update);
    /* And every frame after, as menus scroll and panels move */
    let frame = requestAnimationFrame(function follow() {
      update();
      frame = requestAnimationFrame(follow);
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [device]);

  if (device !== "gamepad") return null;
  return (
    /* On the body: under the HUD's scaled boxes, fixed would be relative to them */
    <Portal container={document.body}>
      <Box
        ref={ref}
        sx={{
          display: "none",
          position: "fixed",
          transformOrigin: "100% 100%",
          zIndex: "padBadge",
          pointerEvents: "none",
          /* Both drawn, one shown: switching never waits on a render */
          "& > .badge-a, & > .badge-start": { display: "none" },
          "&[data-button='A'] > .badge-a, &[data-button='START'] > .badge-start": {
            display: "flex",
          },
        }}
      >
        <PadCombo className="badge-a" pad={{ button: 0 }} />
        <PadCombo className="badge-start" pad={{ button: 9 }} />
      </Box>
      {/* A field's A, drawn beside the field by the highlight (`fieldBadgeHost`) */}
      {fieldBadgeHost && (
        <Portal container={fieldBadgeHost}>
          <PadCombo pad={{ button: 0 }} />
        </Portal>
      )}
    </Portal>
  );
};
