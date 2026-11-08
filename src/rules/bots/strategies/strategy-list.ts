import type { BotStrategyId } from "@/content";
import type { BotStrategy } from "../types";
import { idle } from "./idle";
import { wander } from "./wander";

/** Every strategy, by the id personalities weigh it with. A missing one fails to compile. */
export const BOT_STRATEGIES: Record<BotStrategyId, BotStrategy> = { idle, wander };
