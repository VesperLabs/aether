import { getEventKeyName } from "./keyboard-key";
import { useEffect, useEffectEvent } from "react";

/* Arrows already mean something in these: moving the caret, a slider, a dropdown's options */
const KEEPS_ARROWS = "input, textarea, select, [role='combobox'], [contenteditable='true']";

/**
 * Left and right arrows step through a modal's tabs, wrapping at the ends. A controller's
 * triggers send the same arrows while a modal is open.
 */
export function useArrowTabs<T extends string>(
  tabs: readonly T[],
  tab: T,
  setTab: (tab: T) => void,
) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const key = getEventKeyName(e);
    const step = key === "ARROWLEFT" ? -1 : key === "ARROWRIGHT" ? 1 : 0;
    if (!step || e.repeat) return;
    /* A controller's shoulders send untrusted arrows: those always step tabs, even from a field */
    if (e.isTrusted && document.activeElement?.closest(KEEPS_ARROWS)) return;
    const index = tabs.indexOf(tab);
    setTab(tabs[(index + step + tabs.length) % tabs.length]);
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
