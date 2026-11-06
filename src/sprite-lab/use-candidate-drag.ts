import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Generation } from "./generations-api";
import type { Frame } from "./lab-state";

/** How far the pointer must travel before a press on a thumbnail counts as a drag. */
const DRAG_THRESHOLD = 4;

/** Something that can be dragged onto a frame: a candidate, or the sheet's own frame. */
export type DragItem = {
  url: string;
  frame: Frame;
  /** Makes the new candidate where it lands. */
  copyTo: (frame: Frame) => Promise<Generation>;
  /** Merges it into the sheet, for a drop on the Original tile. */
  merge?: () => void;
};

export type CandidateDrag = { item: DragItem; x: number; y: number };

/** Dragging a thumbnail by pointer, reporting where it was let go. */
export const useCandidateDrag = (onDrop: (item: DragItem, x: number, y: number) => void) => {
  const [drag, setDrag] = useState<CandidateDrag>();

  const startDrag = (item: DragItem, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const [startX, startY] = [e.clientX, e.clientY];
    let dragging = false;
    const handleMove = ({ clientX: x, clientY: y }: PointerEvent) => {
      dragging ||= Math.hypot(x - startX, y - startY) > DRAG_THRESHOLD;
      if (dragging) setDrag({ item, x, y });
    };
    const handleUp = ({ clientX, clientY }: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setDrag(undefined);
      if (dragging) onDrop(item, clientX, clientY);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return { drag, startDrag };
};
