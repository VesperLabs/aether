/** How close to a scroll box's top or bottom edge the pointer must be to scroll it. */
const EDGE_PX = 48;
/** Fastest scroll speed, reached at the very edge, in pixels per frame. */
const MAX_SPEED_PX = 14;

function scrollableAncestor(el: Element | null): HTMLElement | null {
  for (let node = el; node; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(node);
    const scrolls = overflowY === "auto" || overflowY === "scroll";
    if (scrolls && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/** Scrolls whatever scroll box is under a dragged item while the pointer sits near its edge. */
export function createDragAutoscroll() {
  let frame = 0;
  let box: HTMLElement | null = null;
  let speed = 0;

  const tick = () => {
    if (!box || speed === 0) {
      frame = 0;
      return;
    }
    box.scrollTop += speed;
    frame = requestAnimationFrame(tick);
  };

  return {
    /** Call on every pointer move with the element under the pointer. */
    update(target: Element | null, clientY: number) {
      box = scrollableAncestor(target);
      speed = 0;
      if (box) {
        const rect = box.getBoundingClientRect();
        const fromTop = clientY - rect.top;
        const fromBottom = rect.bottom - clientY;
        if (fromTop < EDGE_PX) speed = -MAX_SPEED_PX * (1 - Math.max(fromTop, 0) / EDGE_PX);
        else if (fromBottom < EDGE_PX)
          speed = MAX_SPEED_PX * (1 - Math.max(fromBottom, 0) / EDGE_PX);
      }
      if (speed !== 0 && !frame) frame = requestAnimationFrame(tick);
    },
    stop() {
      speed = 0;
      box = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
