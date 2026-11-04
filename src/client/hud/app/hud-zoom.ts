import { calculateZoomLevel } from "@/client/scenes/camera-zoom";
import { isTypableFieldActive } from "@/client/input/typable-field";

let lastZoom: string | undefined;

export const getHudZoom = () => {
  /* A phone keyboard shrinks the window while typing; keep the HUD's size until it closes */
  if (lastZoom && isTypableFieldActive()) return lastZoom;
  const viewportArea = window.innerWidth * window.innerHeight;
  lastZoom = calculateZoomLevel({
    viewportArea,
    baseZoom: 0.75,
    maxZoom: 2,
    divisor: 3000000,
  });
  return lastZoom;
};
