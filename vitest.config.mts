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
      { extends: true, test: { name: "node", include: ["**/*.test.ts"], environment: "node" } },
      { extends: true, test: { name: "dom", include: ["**/*.test.tsx"], environment: "jsdom" } },
    ],
  },
});
