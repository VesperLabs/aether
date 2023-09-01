const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("./package.json");
require("dotenv").config();

build({
  entryPoints: ["server/main.ts"],
  bundle: true,
  minify: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies || [])),
  platform: "node", // for CJS
  outfile: "dist/server.js",
  define: {
    "process.env.PUBLIC_DIR": JSON.stringify(process.env.PUBLIC_DIR),
    "process.env.SERVER_FPS": JSON.stringify(process.env.SERVER_FPS),
    "process.env.MONGO_URL": JSON.stringify(process.env.MONGO_URL),
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
    "process.env.PORT": JSON.stringify(process.env.PORT),
  },
});
