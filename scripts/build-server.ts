import { build } from "esbuild";
import packageJson from "../package.json" with { type: "json" };

const { dependencies, peerDependencies = {} } = packageJson as {
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

void build({
  entryPoints: ["src/server/main.ts"],
  bundle: true,
  minify: true,
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
  platform: "node",
  outfile: "dist/server.js",
});
