// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/bots";
import { simulateScenario } from "./simulate-scenario";

/** The full world simulates every map's NPCs each tick, so soak scenarios get more time on CI. */
const FULL_WORLD_TIMEOUT_MS = 30_000;

/**
 * Every bot scenario on a fresh simulation: the real server on virtual time, bots connected
 * in-process, so minutes of play take milliseconds. Each check is a soft assertion; known issues
 * are expected to fail.
 */
describe("bot scenarios", () => {
  for (const scenario of SCENARIOS) {
    const test = scenario.knownIssue ? it.fails : it;
    const issue = scenario.knownIssue ? ` (#${scenario.knownIssue})` : "";
    test(
      `${scenario.name}${issue}: ${scenario.description}`,
      async () => {
        const { passed, lines } = await simulateScenario(scenario, {
          onCheck: (ok, message) => expect.soft(ok, message).toBe(true),
        });
        expect(passed, lines.join("\n")).toBe(true);
      },
      scenario.world === "full" ? FULL_WORLD_TIMEOUT_MS : undefined,
    );
  }
});
