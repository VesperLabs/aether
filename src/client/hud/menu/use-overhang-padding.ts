import { useLayoutEffect, type RefObject } from "react";

/** Marks an element that may stick out above its menu, like a big portrait. */
export const OVERHANG_ATTR = "data-overhang";

/**
 * Pads the top of a scrolling menu stack so anything marked with `OVERHANG_ATTR` that sticks out
 * above the stack's content isn't clipped by the scroll box.
 */
export function useOverhangPadding(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = box.getBoundingClientRect();
      /* The box is scaled with the HUD; rects are in screen pixels, padding and scroll in layout pixels */
      const scale = rect.height / box.offsetHeight || 1;
      const pad = parseFloat(box.style.paddingTop) || 0;
      const contentTop = rect.top + (pad - box.scrollTop) * scale;
      let overhang = 0;
      for (const el of box.querySelectorAll(`[${OVERHANG_ATTR}]`)) {
        const r = el.getBoundingClientRect();
        if (r.height > 0) overhang = Math.max(overhang, contentTop - r.top);
      }
      const next = `${Math.ceil(Math.max(0, overhang) / scale)}px`;
      if (box.style.paddingTop !== next) box.style.paddingTop = next;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(schedule);
    for (const child of box.children) resize.observe(child);
    const mutation = new MutationObserver(schedule);
    mutation.observe(box, { childList: true, subtree: true, attributes: true });
    schedule();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
