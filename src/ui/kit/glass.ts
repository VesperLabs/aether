/** The CSS variable the game sets for how dark the world is behind the HUD (see daylight.ts). */
const GLASS_WASH_VAR = "--glass-wash";

/** At full dark, how light a wash lies on the glass, so a dark pane still stands out from a dark world. */
const NIGHT_WASH = 0.16;

/** The HUD glass's variables for a night share, 0 by day to 1 in full dark. */
export function glassAtNight(night: number) {
  return {
    [GLASS_WASH_VAR]: `rgba(255, 255, 255, ${(NIGHT_WASH * night).toFixed(3)})`,
  };
}

/** A thin light rim inside the glass, brightest along the top, so it reads as a pane with an edge. */
export const GLASS_EDGE =
  "inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 0 0 1px rgba(255, 255, 255, 0.05)";

/** A fine grain, drawn once by the browser and tiled: what makes a tint read as frosted. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter><rect width="96" height="96" filter="url(#n)"/></svg>',
)}")`;

/**
 * Frost without a blur: a live blur over the moving game redraws every frame and costs a lot of
 * frame rate. Instead a soft veil lowers the contrast of the world behind, a grain frosts it, and a
 * faint highlight along the top catches the light.
 */
const FROST = [
  "linear-gradient(rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 45%)",
  GRAIN,
  "linear-gradient(rgba(120, 130, 145, 0.2), rgba(120, 130, 145, 0.2))",
].join(", ");

/** A light wash over the glass at night, under its own tint. Transparent by day. */
const GLASS_WASH = `var(${GLASS_WASH_VAR}, transparent)`;

/**
 * The glass's frost and night wash as background layers, to lie over a glass's own colour (`bg`)
 * without replacing it.
 */
export const GLASS_WASH_LAYER = `${FROST}, linear-gradient(${GLASS_WASH}, ${GLASS_WASH})`;
