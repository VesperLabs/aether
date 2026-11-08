import type { Rng } from "@/rules/world";
import { chooseStrategy } from "./choose-strategy";
import { BOT_STRATEGY_MS, BOT_TASK_MS, BOT_TASK_PRIORITY } from "./constants";
import { BOT_REFLEXES } from "./reflexes/reflex-list";
import { settleIntents } from "./settle";
import { BOT_STRATEGIES } from "./strategies/strategy-list";
import { BOT_TASKS } from "./tasks/task-list";
import type { BotIntent, BotMemory, BotMind, BotStep, BotTask, WeightedIntent } from "./types";

/** A newborn bot's memory. Its first task waits a random slice of a beat, so bots spread out. */
export function createBotMemory(now: number, rng: Rng): BotMemory {
  return {
    strategy: null,
    plan: null,
    stepStartedAt: now,
    diedAt: null,
    nextStrategyAt: now,
    nextTaskAt: now + rng() * BOT_TASK_MS,
  };
}

/**
 * One think: reconsider the strategy when it is due, advance the current task when it is due, and
 * always run the reflexes. Returns the new memory and at most one intent per channel.
 */
export function thinkBot(mind: BotMind): { memory: BotMemory; intents: BotIntent[] } {
  const { now, self } = mind.view;
  let memory: BotMemory = {
    ...mind.memory,
    diedAt: self.isDead ? (mind.memory.diedAt ?? now) : null,
  };
  const weighted: WeightedIntent[] = [];

  if (!self.isDead) {
    if (now >= memory.nextStrategyAt || !memory.plan) memory = reconsider({ ...mind, memory });
    if (now >= memory.nextTaskAt) {
      const step = advance({ ...mind, memory });
      memory = step.memory;
      weighted.push(...step.intents.map((intent) => ({ priority: BOT_TASK_PRIORITY, intent })));
    }
  }
  for (const reflex of BOT_REFLEXES) weighted.push(...reflex({ ...mind, memory }));

  return { memory, intents: settleIntents(weighted) };
}

/** Picks the strategy again, and a fresh plan when it changed or the old plan ran out. */
function reconsider(mind: BotMind): BotMemory {
  const { memory, view } = mind;
  const strategy = chooseStrategy(mind);
  if (strategy === memory.strategy && memory.plan) {
    return { ...memory, nextStrategyAt: view.now + BOT_STRATEGY_MS };
  }
  return {
    ...memory,
    strategy,
    plan: strategy && BOT_STRATEGIES[strategy].plan(mind),
    stepStartedAt: view.now,
    nextStrategyAt: view.now + BOT_STRATEGY_MS,
  };
}

/** Runs the plan's current step. A finished step moves on; a failed one drops the plan. */
function advance(mind: BotMind): { memory: BotMemory; intents: BotIntent[] } {
  const { memory, view } = mind;
  const nextTaskAt = view.now + BOT_TASK_MS;
  const plan = memory.plan;
  const step = plan?.steps[plan.step];
  if (!plan || !step) return { memory: replanNow(memory, nextTaskAt), intents: [] };

  const { status, intents } = runStep(mind, step);
  if (status === "failed") return { memory: replanNow(memory, nextTaskAt), intents };
  if (status === "running") return { memory: { ...memory, nextTaskAt }, intents };

  const next = { ...plan, step: plan.step + 1 };
  if (next.step >= plan.steps.length) return { memory: replanNow(memory, nextTaskAt), intents };
  return { memory: { ...memory, plan: next, stepStartedAt: view.now, nextTaskAt }, intents };
}

/** Drops the plan and asks the strategy layer to think on the next think. */
function replanNow(memory: BotMemory, nextTaskAt: number): BotMemory {
  return { ...memory, plan: null, nextStrategyAt: 0, nextTaskAt };
}

function runStep(mind: BotMind, step: BotStep) {
  /* TypeScript can't tie a step's params to its task through the lookup; BotStep keeps them paired. */
  const task = BOT_TASKS[step.task] as BotTask<BotStep["task"]>;
  return task.run(mind, step.params);
}
