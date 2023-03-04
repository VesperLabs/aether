const dotenv = require("dotenv");
const esbuild = require("esbuild");
dotenv.config();

esbuild.build({
  entryPoints: ["./src/index.js"],
  bundle: true,
  outfile: "./public/bundle.min.js",
  loader: {
    ".js": "jsx",
  },
  target: "es2016",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.PORT": JSON.stringify(process.env.PORT),
    "process.env.SERVER_FPS": process.env.SERVER_FPS,
    "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
  },
});
