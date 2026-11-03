import { configDefaults, defineConfig } from "vitest/config";

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
          exclude: [...configDefaults.exclude, ".claude/**", "**/*.sim.test.ts"],
          environment: "node",
        },
      },
      /* Real servers on real sockets (src/sim): one file at a time, so runs stay reproducible. */
      {
        extends: true,
        test: {
          name: "sim",
          include: ["**/*.sim.test.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
      { extends: true, test: { name: "dom", include: ["**/*.test.tsx"], environment: "jsdom" } },
    ],
  },
});
