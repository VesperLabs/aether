/** CSS variables the game sets for how dark the world is behind the HUD (see daylight.ts). */
const GLASS_BRIGHTNESS_VAR = "--glass-brightness";
const GLASS_WASH_VAR = "--glass-wash";

/** At full dark: how much the world behind the glass is brightened, and how light a wash lies on it. */
const NIGHT_BRIGHTNESS = 1.8;
const NIGHT_WASH = 0.1;

/** The HUD glass's variables for a night share, 0 by day to 1 in full dark. */
export function glassAtNight(night: number) {
  return {
    [GLASS_BRIGHTNESS_VAR]: (1 + (NIGHT_BRIGHTNESS - 1) * night).toFixed(2),
    [GLASS_WASH_VAR]: `rgba(255, 255, 255, ${(NIGHT_WASH * night).toFixed(3)})`,
  };
}

/**
 * The frosted glass behind menus and HUD bars: a strong blur, and at night the world behind it
 * brightened, so a dark pane still stands out from a dark world instead of sinking into it.
 */
export const GLASS_BACKDROP = `blur(16px) brightness(var(${GLASS_BRIGHTNESS_VAR}, 1))`;

/** The same glass, lightly blurred, for small round buttons: the action buttons and their costs. */
export const BUTTON_GLASS_BACKDROP = `blur(2px) brightness(var(${GLASS_BRIGHTNESS_VAR}, 1))`;

/** A light wash over the glass at night, under its own tint. Transparent by day. */
export const GLASS_WASH = `var(${GLASS_WASH_VAR}, transparent)`;

/** The wash as a background layer, to lie under a glass's own colour (`bg`) without replacing it. */
export const GLASS_WASH_LAYER = `linear-gradient(${GLASS_WASH}, ${GLASS_WASH})`;
