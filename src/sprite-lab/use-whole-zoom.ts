import { useEffect, useState } from "react";

/**
 * The widest a frame `cell` pixels across can be drawn inside an element at a whole zoom (1×, 2×,
 * 3×...), so every sprite pixel covers the same number of screen pixels and none come out smeared.
 * Pass `measure` as the ref of a block that fills the space the frame may take.
 */
export const useWholeZoom = (cell: number) => {
  const [element, measure] = useState<HTMLElement | null>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { measure, width: Math.max(1, Math.floor(available / cell)) * cell };
};
