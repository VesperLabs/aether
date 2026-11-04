export const MODAL_ATTR = "data-modal";

const SHAKE_OFFSETS = ["0 0", "-4px 2px", "4px -2px", "-3px -1px", "3px 1px", "-1px 1px", "0 0"];
const SHAKE_MS = 320;

/** Rattles the modal around `element`. `translate` leaves the modal's centering transform alone. */
export function shakeModal(element: Element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element
    .closest(`[${MODAL_ATTR}]`)
    ?.animate({ translate: SHAKE_OFFSETS }, { duration: SHAKE_MS, easing: "ease-out" });
}
