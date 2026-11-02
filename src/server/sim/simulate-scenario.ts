import { Agent, runScenario, type RunOptions, type Scenario } from "@/agents";
import { createSimulation } from "./simulation";

/** Runs a scenario on its own fresh, seeded simulation, with cheat-enabled agents in-process. */
export async function simulateScenario(
  scenario: Scenario,
  options: Pick<RunOptions, "print" | "onCheck"> = {},
) {
  const sim = await createSimulation({ mapNpcs: scenario.world === "full" });
  try {
    return await sim.run(() =>
      runScenario(scenario, {
        ...options,
        join: (name, charClass) =>
          Agent.join(sim.connect(), { name, charClass, clock: sim.clock, cheats: true }),
        clock: sim.clock,
      }),
    );
  } finally {
    sim.close();
  }
}
