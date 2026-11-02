// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SCENARIOS, runScenario } from "@/agents";
import { joinTestAgent, realClock, startLocalServer } from "../agents";

/** Every agent scenario against a fresh in-process server. Known issues are expected to fail. */
let server: Awaited<ReturnType<typeof startLocalServer>>;

beforeAll(async () => {
  server = await startLocalServer();
}, 60000);

afterAll(() => server?.close());

describe("agent scenarios", () => {
  for (const scenario of SCENARIOS) {
    const test = scenario.knownIssue ? it.fails : it;
    const label = scenario.knownIssue
      ? `${scenario.name} (#${scenario.knownIssue})`
      : scenario.name;
    test(
      label,
      async () => {
        const result = await runScenario(scenario, {
          join: (name, charClass) => joinTestAgent(server.url, name, charClass),
          clock: realClock,
        });
        expect(result.passed, result.lines.join("\n")).toBe(true);
      },
      60000,
    );
  }
});
