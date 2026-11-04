/** Marks a button that opens when a dragged item rests on it, like a spring-loaded folder. */
export const SPRING_OPEN_ATTR = "data-spring-open";
/** Fired on a spring-loaded button when it should open (buttons here act on press, not `click`). */
export const SPRING_OPEN_EVENT = "springopen";
/** How long a dragged item must rest on a spring-loaded button before it opens. */
const SPRING_DELAY_MS = 1000;

/** Opens a spring-loaded button once a dragged item has hovered it long enough. */
export function createDragSpringOpen() {
  let button: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
    button = null;
  };

  return {
    /** Call on every pointer move with the element under the pointer. */
    update(target: Element | null) {
      const next = target?.closest<HTMLElement>(`[${SPRING_OPEN_ATTR}]`) ?? null;
      if (next === button) return;
      stop();
      if (!next) return;
      button = next;
      timer = setTimeout(() => {
        next.dispatchEvent(new Event(SPRING_OPEN_EVENT));
        stop();
      }, SPRING_DELAY_MS);
    },
    stop,
  };
}
