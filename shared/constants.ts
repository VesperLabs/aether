/**
 * Default Phaser / socket tick rate when SERVER_FPS is unset.
 */
export const DEFAULT_SERVER_FPS = 20;

/** Client render delay in server ticks: (1000 / SERVER_FPS) * ticks ms. 2 ≈ lower latency than 3. */
export const INTERPOLATION_BUFFER_TICKS = 2;
