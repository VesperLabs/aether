import { useLayoutEffect, useRef } from "react";

const isShown = (el: Element) => el instanceof HTMLElement && el.offsetHeight > 0;

/** Jumps a menu stack to a menu as it opens, whether it mounts or turns visible. */
export function useScrollToOpened<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    let shown = new Set([...box.children].filter(isShown));
    const observer = new MutationObserver(() => {
      const now = new Set([...box.children].filter(isShown));
      const opened = [...now].find((el) => !shown.has(el));
      shown = now;
      opened?.scrollIntoView({ block: "nearest" });
    });
    observer.observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return ref;
}
