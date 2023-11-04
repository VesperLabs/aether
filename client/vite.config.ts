//@ts-nocheck
import { defineConfig, loadEnv } from "vite";
require("dotenv").config();
import react from "@vitejs/plugin-react-swc";
const path = require("path");
const parentDir = path.resolve(__dirname, "..");

export default ({ mode }) => {
  process.env = Object.assign(process.env, loadEnv(mode, parentDir, ""));
  console.log(`🛠 DEBUG: ${process.env.DEBUG}`);
  console.log(`🛠 SERVER_FPS: ${process.env.SERVER_FPS}`);
  console.log(`🛠 SERVER_URL: ${process.env.SERVER_URL}`);
  console.log(`🛠 ASSETS_URL: ${process.env.ASSETS_URL}`);
  console.log(`🛠 PEER_SERVER_PORT: ${process.env.PEER_SERVER_PORT}`);

  return defineConfig({
    envDir: "../",
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
      "process.env.DEBUG": process.env.DEBUG,
      "process.env.SERVER_FPS": process.env.SERVER_FPS,
      "process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
      "process.env.ASSETS_URL": JSON.stringify(process.env.ASSETS_URL),
      "process.env.PEER_SERVER_PORT": JSON.stringify(process.env.PEER_SERVER_PORT),
    },
    server: {
      host: true,
    },
    publicDir: "../public", //serves this folder for our dev instance.
    build: {
      assetsDir: "./", //puts our js files 1 directory up from the /assets folder
      emptyOutDir: false, //we dont want to delete the public folder. its where we store pics
      outDir: "../public",
    },
  });
};
