import { createRng, seedFromString } from "@/rules/world";
import type { Agent } from "../agent";
import type { Brain } from "../brain";
import type { Clock } from "../link";

/** What a scenario gets to drive agents and record what it saw. */
interface ScenarioContext {
  /** Brings a cheat-enabled agent into the game, next to `near` when the run has one. */
  spawn: (name: string, charClass?: string) => Promise<Agent>;
  /** Runs a brain on an agent for a while, then stops it. */
  live: (agent: Agent, brain: Brain, ms: number) => Promise<void>;
  clock: Clock;
  /** Records a step for the report. */
  log: (message: string) => void;
  /** Records a check; a failed one fails the scenario but the run carries on. */
  check: (passed: boolean, message: string) => void;
}

/** A scripted test: agents play out a situation and check what the server did. */
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
  /** How the host brings an agent in (its link, server and cheats). */
  join: (name: string, charClass?: string) => Promise<Agent>;
  clock: Clock;
  /** A player's name to bring the agents to, so they can be watched in the game. */
  near?: string;
  /** Called with each line as it happens. */
  print?: (line: string) => void;
}

/** Runs one scenario, always sending its agents home, and reports every step and check. */
export async function runScenario(
  scenario: Scenario,
  { join, clock, near, print = () => {} }: RunOptions,
) {
  const agents: Agent[] = [];
  const lines: string[] = [];
  let passed = true;
  const write = (line: string) => {
    lines.push(line);
    print(line);
  };

  const ctx: ScenarioContext = {
    clock,
    spawn: async (name, charClass) => {
      const agent = await join(name, charClass);
      agents.push(agent);
      if (near) {
        const went = await agent.cheat(`/goto ${near}`);
        if (went.type === "error") throw new Error(went.message);
      }
      return agent;
    },
    live: async (agent, brain, ms) => {
      const life = new AbortController();
      const living = brain(agent, {
        clock,
        rng: createRng(seedFromString(`${scenario.name}:${agent.name}`)),
        signal: life.signal,
      });
      await clock.sleep(ms);
      life.abort();
      await living;
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
    agents.forEach((agent) => agent.leave());
  }
  return { name: scenario.name, passed, lines };
}
