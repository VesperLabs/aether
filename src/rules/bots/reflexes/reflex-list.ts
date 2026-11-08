import type { BotReflex } from "../types";
import { respawn } from "./respawn";

/** Every reflex. All of them run on every think. */
export const BOT_REFLEXES: readonly BotReflex[] = [respawn];
