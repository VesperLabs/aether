import { configDefaults, defineConfig } from "vitest/config";

const AGENT_SCENARIOS = "src/server/tests/agents.test.ts";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    // Server logs ("🔌 Noob disconnected") only show for failing tests.
    silent: "passed-only",
    exclude: [...configDefaults.exclude, ".claude/**"],
    // Only component tests (.tsx) need a DOM; everything else runs in plain node.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["**/*.test.ts"],
          exclude: [...configDefaults.exclude, ".claude/**", AGENT_SCENARIOS],
          environment: "node",
        },
      },
      { extends: true, test: { name: "dom", include: ["**/*.test.tsx"], environment: "jsdom" } },
      // Agents play in real time (about 35s), so they run as their own CI job: npm run test:agents
      { extends: true, test: { name: "agents", include: [AGENT_SCENARIOS], environment: "node" } },
    ],
  },
});
