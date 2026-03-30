/**
 * Default Phaser / socket tick rate when SERVER_FPS is unset.
 */
export const DEFAULT_SERVER_FPS = 20;

/** Client render delay in server ticks: (1000 / SERVER_FPS) * ticks ms. 2 ≈ lower latency than 3. */
export const INTERPOLATION_BUFFER_TICKS = 2;

/**
 * Added on top of tick-based interpolation delay so brief RTT spikes do not empty the snapshot
 * window (reduces remote entity snap-back). Tradeoff: slightly more display lag vs server.
 */
export const EXTRA_INTERPOLATION_BUFFER_MS = 32;
