import { Bot, runScenario, type RunOptions, type Scenario } from "@/bots";
import { readRoomMap } from "../map-files";
import { createSimulation } from "./simulation";

/** Runs a scenario on its own fresh, seeded simulation, with cheat-enabled bots in-process. */
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
          Bot.join(sim.connect(), {
            name,
            charClass,
            clock: sim.clock,
            maps: readRoomMap,
            cheats: true,
          }),
        clock: sim.clock,
      }),
    );
  } finally {
    sim.close();
  }
}
