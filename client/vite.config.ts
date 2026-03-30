import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";
import { DEFAULT_SERVER_FPS } from "../shared/constants";

dotenv.config();

/** Repo root when Vite is run from `client/` (see npm scripts). */
const parentDir = path.resolve(process.cwd(), "..");

export default ({ mode, command }) => {
  process.env = Object.assign(process.env, loadEnv(mode, parentDir, ""));
  console.log(`🛠 DEBUG: ${process.env.DEBUG}`);
  console.log(`🛠 SERVER_FPS: ${process.env.SERVER_FPS}`);
  console.log(`🛠 SERVER_URL: ${process.env.SERVER_URL}`);
  console.log(`🛠 ASSETS_URL: ${process.env.ASSETS_URL}`);
  console.log(`🛠 PEER_CLIENT_PORT: ${process.env.PEER_CLIENT_PORT}`);
  console.log(`🛠 PEER_CLIENT_PATH: ${process.env.PEER_CLIENT_PATH}`);

  return defineConfig({
    envDir: "../",
    // Dev serves static assets from public; build writes into public — avoid copying public onto itself
    publicDir: command === "serve" ? "../public" : false,
    plugins: [
      {
        name: "replace-url",
        transform(code, id) {
          return process.env.ASSETS_URL
            ? code.replace(/\.\/assets\//g, process.env.ASSETS_URL + "/")
            : code;
        },
      },
      react(),
    ],
    define: {
      /* Values must be JSON-serialized literals; undefined breaks esbuild in CI/Docker with no .env */
      "process.env.DEBUG": process.env.DEBUG === "true",
      "process.env.SERVER_FPS": JSON.stringify(
        process.env.SERVER_FPS ?? String(DEFAULT_SERVER_FPS)
      ),
      "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL ?? ""),
      "process.env.ASSETS_URL": JSON.stringify(process.env.ASSETS_URL ?? ""),
      "process.env.PEER_CLIENT_PORT": JSON.stringify(process.env.PEER_CLIENT_PORT ?? ""),
      "process.env.PEER_CLIENT_PATH": JSON.stringify(process.env.PEER_CLIENT_PATH ?? ""),
    },
    server: {
      host: true,
    },
    build: {
      assetsDir: "./", //puts our js files 1 directory up from the /assets folder
      emptyOutDir: false, //we dont want to delete the public folder. its where we store pics
      outDir: "../public",
    },
  });
};
