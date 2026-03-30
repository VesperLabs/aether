/**
 * Default Phaser / socket tick rate when SERVER_FPS is unset.
 */
export const DEFAULT_SERVER_FPS = 20;

/** Client render delay in server ticks. 3 = smoother motion; pairs with velocity display lead. */
export const INTERPOLATION_BUFFER_TICKS = 3;

/**
 * Added on top of tick-based interpolation delay so brief RTT spikes do not empty the snapshot
 * window (reduces remote entity snap-back). Tradeoff: slightly more display lag vs server.
 */
export const EXTRA_INTERPOLATION_BUFFER_MS = 16;

/** Max px to nudge interpolated NPC/remote sprites along velocity (covers buffer delay without overshoot). */
export const NET_DISPLAY_LEAD_MAX_PX = 56;
