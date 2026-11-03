import { configDefaults, defineConfig } from "vitest/config";

/* Long simulation runs (`npm run soak`). Never part of `npm test` or `npm run check`. */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ["src/sim/soak/**/*.soak.ts"],
    exclude: [...configDefaults.exclude, ".claude/**"],
    environment: "node",
    fileParallelism: false,
    silent: false,
  },
});
