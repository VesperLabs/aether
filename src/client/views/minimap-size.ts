export const MINI_MAP_SIZE = 160;
/** Gap between the minimap and the top-right corner of the screen. */
export const MINI_MAP_MARGIN = 12;
/** CSS's match for the camera tween's `Sine.easeInOut`. */
export const MINI_MAP_EASE = "cubic-bezier(.37,0,.63,1)";
/** The camera tweens these, and the HUD's frame around it transitions in step. */
export const MINI_MAP_OPEN_MS = 340;
export const MINI_MAP_CLOSE_MS = 280;
/** CSS variable with how open the minimap is, 0 to 1: the camera's tween sets it, the HUD's frame follows. */
export const MINI_MAP_OPEN_VAR = "--minimap-open";
