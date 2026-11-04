import { isTypableFieldActive } from "@/client/input/typable-field";
import { getHudZoomFor } from "@/ui/kit/hud-scale";
import { isMobile } from "@/ui/kit/is-mobile";

let lastZoom: string | undefined;

export const getHudZoom = () => {
  /* A phone keyboard shrinks the window while typing; keep the HUD's size until it closes */
  if (lastZoom && isMobile && isTypableFieldActive()) return lastZoom;
  lastZoom = getHudZoomFor(window.innerWidth, window.innerHeight);
  return lastZoom;
};
