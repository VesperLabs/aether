import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

/** The elements a tooltip points at: whatever carries its `data-tooltip-id`. */
const anchorSelector = (id: string) => `[data-tooltip-id="${CSS.escape(id)}"]`;

/**
 * The anchor a controlled tooltip opens at, looked up the moment it opens: the one under the
 * pointer when several share the id, else the first. Nothing is cached, so it can't go stale.
 */
export function useOpenAnchor(id: string | undefined, isOpen: boolean | undefined) {
  const [anchor, setAnchor] = useState<Element | null>(null);
  useLayoutEffect(() => {
    if (!isOpen || !id) return setAnchor(null);
    const all = [...document.querySelectorAll(anchorSelector(id))];
    setAnchor(all.find((el) => el.matches(":hover")) ?? all[0] ?? null);
  }, [id, isOpen]);
  return anchor;
}

/** The anchor the pointer is over, for a tooltip that opens on hover by itself. */
export function useHoveredAnchor(id: string | undefined, enabled: boolean) {
  const [anchor, setAnchor] = useState<Element | null>(null);
  useEffect(() => {
    if (!enabled || !id) return setAnchor(null);
    const selector = anchorSelector(id);
    const anchorOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest(selector) : null;
    const over = (event: MouseEvent) => {
      const hovered = anchorOf(event.target);
      if (hovered) setAnchor(hovered);
    };
    const out = (event: MouseEvent) => {
      const left = anchorOf(event.target);
      /* Moving between an anchor's own children isn't leaving it */
      if (!left || (event.relatedTarget instanceof Node && left.contains(event.relatedTarget))) {
        return;
      }
      setAnchor(null);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
    };
  }, [id, enabled]);
  return anchor;
}

/*
 * The tooltips showing, innermost last. Opening one closes every other at once, except those it
 * sits inside (a quest's reward over the quest), so an owner slow to close never leaves one behind.
 */
let shown: { key: string; floating: () => Element | null }[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether this tooltip is still the one showing (or one holding it), while it wants to be open. */
export function useShownAlone(
  key: string,
  open: boolean,
  anchor: Element | null,
  floating: () => Element | null,
) {
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    shown = [...shown.filter((other) => other.floating()?.contains(anchor)), { key, floating }];
    notify();
    return () => {
      shown = shown.filter((other) => other.key !== key);
      notify();
    };
  }, [key, open, anchor, floating]);
  return useSyncExternalStore(subscribe, () => shown.some((other) => other.key === key));
}
