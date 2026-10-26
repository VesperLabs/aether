import { calculateZoomLevel } from "@/client/scenes/camera-zoom";

export const getHudZoom = () => {
  const viewportArea = window.innerWidth * window.innerHeight;
  return calculateZoomLevel({
    viewportArea,
    baseZoom: 0.75,
    maxZoom: 2,
    divisor: 3000000,
  });
};
