import type { BotTask, BotTaskId } from "../types";
import { idle } from "./idle";
import { pause } from "./pause";
import { walkTo } from "./walk-to";

/** Every task, by id. A task declared in `BotTaskParams` but missing here fails to compile. */
export const BOT_TASKS: { [K in BotTaskId]: BotTask<K> } = { idle, pause, walkTo };
