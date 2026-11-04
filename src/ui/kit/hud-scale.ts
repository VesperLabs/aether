const MIN_HUD_ZOOM = 0.75;
const MAX_HUD_ZOOM = 2;
/** Screen area, in pixels, that adds 1 to the zoom. */
const PIXELS_PER_ZOOM = 3_000_000;

/** The HUD scale for a window of this size, as a number in a string. */
export function getHudZoomFor(width: number, height: number) {
  const zoom = MIN_HUD_ZOOM + (width * height) / PIXELS_PER_ZOOM;
  return Math.min(Math.max(zoom, MIN_HUD_ZOOM), MAX_HUD_ZOOM).toFixed(2);
}

/** What a modal is scaled by for a HUD zoom: it never shrinks below its real size. */
export const getModalScale = (zoom: number | string) => Math.max(1, Number(zoom));

/** The login stands alone on its screen, so it gets more room than other modals. */
const LOGIN_BOOST = 1.2;

/** What the login form is scaled by for a HUD zoom, on the game and the wiki alike. */
export const getLoginScale = (zoom: number | string) => getModalScale(zoom) * LOGIN_BOOST;
