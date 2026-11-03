import { build } from "esbuild";
import packageJson from "../package.json" with { type: "json" };

const { dependencies, peerDependencies = {} } = packageJson as {
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/* The server, plus what scripts/start.sh runs next to it in the container (dev deps like tsx are pruned there). */
const ENTRIES: Record<string, string> = {
  "dist/server.cjs": "src/server/main.ts",
  "dist/ambient-bots.cjs": "src/bots/ambient/main.ts",
  "dist/seed-bots.cjs": "scripts/seed-bots.ts",
};

for (const [outfile, entry] of Object.entries(ENTRIES)) {
  void build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
    platform: "node",
    outfile,
  });
}
