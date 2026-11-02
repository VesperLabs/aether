import { Bot } from "./bot";

/** What a scenario gets to drive bots and record what it saw. */
interface ScenarioContext {
  /** Brings a bot into the game, next to `near` when the run was given a player to watch. */
  spawn: (name: string, charClass?: string) => Promise<Bot>;
  /** Records a step for the report. */
  log: (message: string) => void;
  /** Records a check; a failed one fails the scenario but the run carries on. */
  check: (passed: boolean, message: string) => void;
}

export interface Scenario {
  name: string;
  description: string;
  /** An open issue this scenario shows; it is expected to fail until the issue is fixed. */
  knownIssue?: number;
  run: (ctx: ScenarioContext) => Promise<void>;
}

interface ScenarioResult {
  name: string;
  passed: boolean;
  lines: string[];
}

export interface RunOptions {
  url: string;
  /** A player's name to bring the bots to, so they can be watched in the game. */
  near?: string;
  /** Called with each line as it happens. */
  print?: (line: string) => void;
}

/** Runs one scenario, always disconnecting its bots, and reports every step and check. */
export async function runScenario(
  scenario: Scenario,
  { url, near, print = () => {} }: RunOptions,
): Promise<ScenarioResult> {
  const bots: Bot[] = [];
  const lines: string[] = [];
  let passed = true;
  const write = (line: string) => {
    lines.push(line);
    print(line);
  };

  const ctx: ScenarioContext = {
    spawn: async (name, charClass) => {
      const bot = await Bot.join({ url, name, charClass });
      bots.push(bot);
      if (near) {
        const went = await bot.cheat(`/goto ${near}`);
        if (went.type === "error") throw new Error(went.message);
      }
      return bot;
    },
    log: (message) => write(`  · ${message}`),
    check: (ok, message) => {
      if (!ok) passed = false;
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
