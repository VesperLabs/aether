import { createRng, seedFromString } from "@/rules/world";
import type { Bot } from "../bot";
import type { Brain } from "../brain";
import type { Clock } from "../link";

/** What a scenario gets to drive bots and record what it saw. */
interface ScenarioContext {
  /** Brings a cheat-enabled bot into the game, next to `near` when the run has one. */
  spawn: (name: string, charClass?: string) => Promise<Bot>;
  /** Runs a brain on a bot for a while, then stops it. */
  live: (bot: Bot, brain: Brain, ms: number) => Promise<void>;
  clock: Clock;
  /** Records a step for the report. */
  log: (message: string) => void;
  /** Records a check; a failed one fails the scenario but the run carries on. */
  check: (passed: boolean, message: string) => void;
}

/** A scripted test: bots play out a situation and check what the server did. */
export interface Scenario {
  name: string;
  description: string;
  /**
   * "empty" (default): real maps, but only the NPCs the scenario summons, so it tests one thing.
   * "full": every map NPC too, for soak runs. Either way a seeded simulation plays the same.
   */
  world?: "empty" | "full";
  /** An open issue this scenario shows; it is expected to fail until the issue is fixed. */
  knownIssue?: number;
  run: (ctx: ScenarioContext) => Promise<void>;
}

export interface RunOptions {
  /** How the host brings a bot in (its link, server and cheats). */
  join: (name: string, charClass?: string) => Promise<Bot>;
  clock: Clock;
  /** A player's name to bring the bots to, so they can be watched in the game. */
  near?: string;
  /** Called with each line as it happens. */
  print?: (line: string) => void;
  /** Called with each check as it happens, so a test runner can assert on it. */
  onCheck?: (passed: boolean, message: string) => void;
}

/** Runs one scenario, always sending its bots home, and reports every step and check. */
export async function runScenario(
  scenario: Scenario,
  { join, clock, near, print = () => {}, onCheck }: RunOptions,
) {
  const bots: Bot[] = [];
  const lines: string[] = [];
  let passed = true;
  const write = (line: string) => {
    lines.push(line);
    print(line);
  };

  const ctx: ScenarioContext = {
    clock,
    spawn: async (name, charClass) => {
      const bot = await join(name, charClass);
      bots.push(bot);
      if (near) {
        const went = await bot.cheat(`/goto ${near}`);
        if (went.type === "error") throw new Error(went.message);
      }
      return bot;
    },
    live: async (bot, brain, ms) => {
      const life = new AbortController();
      const living = brain(bot, {
        clock,
        rng: createRng(seedFromString(`${scenario.name}:${bot.name}`)),
        signal: life.signal,
      });
      await clock.sleep(ms);
      life.abort();
      await living;
    },
    log: (message) => write(`  · ${message}`),
    check: (ok, message) => {
      if (!ok) passed = false;
      onCheck?.(ok, message);
      write(`  ${ok ? "✓" : "✗"} ${message}`);
    },
  };

  write(`▶ ${scenario.name}: ${scenario.description}`);
  try {
    await scenario.run(ctx);
  } catch (error) {
    passed = false;
    write(`  ✗ crashed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    bots.forEach((bot) => bot.leave());
  }
  return { name: scenario.name, passed, lines };
}
