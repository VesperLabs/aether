/** How often a bot reconsiders what it is working toward, ms. */
export const BOT_STRATEGY_MS = 5000;
/** How often a bot advances its current task, ms. */
export const BOT_TASK_MS = 250;
/** How long a dead bot lies there before respawning, ms. */
export const BOT_RESPAWN_DELAY_MS = 3000;
/** A new strategy must beat the current one by this factor, so bots don't flip-flop. */
export const BOT_STRATEGY_STICKINESS = 1.2;
/** The priority of a task's intents. Reflexes that should override a task go above it. */
export const BOT_TASK_PRIORITY = 10;
