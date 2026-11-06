import { useState, type PointerEvent as ReactPointerEvent } from "react";

export type PanelPosition = { x: number; y: number };

const storageKey = (id: string) => `sprite-lab-panel-${id}`;
/** How much of a panel must stay on screen to grab it, should the window have shrunk. */
const KEEP_ON_SCREEN = 60;

const readPosition = (id: string, start: PanelPosition) => {
  try {
    const { x, y } = JSON.parse(localStorage.getItem(storageKey(id)) ?? "") as PanelPosition;
    return {
      x: Math.min(x, window.innerWidth - KEEP_ON_SCREEN),
      y: Math.min(y, window.innerHeight - KEEP_ON_SCREEN),
    };
  } catch {
    return start;
  }
};

const savePosition = (id: string, position: PanelPosition) => {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(position));
  } catch {
    /* Only a convenience: it just opens in its start spot next time. */
  }
};

/** Where a floating panel sits, remembered per panel, and a way to drag it. */
export const usePanelPosition = (id: string, start: PanelPosition) => {
  const [position, setPosition] = useState(() => readPosition(id, start));

  /* Follows the pointer on the window, so a fast drag can't slip off the panel and get stuck. */
  const startDrag = (e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault();
    const { width, height } = e.currentTarget.getBoundingClientRect();
    const [grabX, grabY] = [e.clientX - position.x, e.clientY - position.y];
    let latest = position;
    const handleMove = ({ clientX, clientY }: PointerEvent) => {
      latest = {
        x: Math.min(window.innerWidth - width, Math.max(0, clientX - grabX)),
        y: Math.min(
          window.innerHeight - Math.min(height, KEEP_ON_SCREEN),
          Math.max(0, clientY - grabY),
        ),
      };
      setPosition(latest);
    };
    const handleEnd = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      savePosition(id, latest);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  };

  return { position, startDrag };
};
