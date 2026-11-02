// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Agent, SCENARIOS, runScenario } from "@/agents";
import { createSimulation } from "../sim";

/**
 * Every agent scenario on a fresh simulation: the real server on virtual time, agents connected
 * in-process. Minutes of play take milliseconds. Known issues are expected to fail.
 */
/** The full world simulates every map's NPCs each tick, so soak scenarios get more time on CI. */
const FULL_WORLD_TIMEOUT_MS = 30_000;

describe("agent scenarios", () => {
  for (const scenario of SCENARIOS) {
    const test = scenario.knownIssue ? it.fails : it;
    const label = scenario.knownIssue
      ? `${scenario.name} (#${scenario.knownIssue})`
      : scenario.name;
    test(
      label,
      async () => {
        const sim = await createSimulation({ mapNpcs: scenario.world === "full" });
        const result = await sim.run(() =>
          runScenario(scenario, {
            join: (name, charClass) =>
              Agent.join(sim.connect(), { name, charClass, clock: sim.clock, cheats: true }),
            clock: sim.clock,
          }),
        );
        sim.close();
        expect(result.passed, result.lines.join("\n")).toBe(true);
      },
      scenario.world === "full" ? FULL_WORLD_TIMEOUT_MS : undefined,
    );
  }
});
