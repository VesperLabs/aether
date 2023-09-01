const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("./package.json");

build({
  entryPoints: ["server/main.ts"],
  bundle: true,
  minify: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies || [])),
  platform: "node", // for CJS
  outfile: "dist/server.js",
});
