import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

/** Repo root — npm runs the web dev script with cwd `web/`, so the root `.env` is not picked up by default. */
const parentDir = path.resolve(process.cwd(), "..");

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  process.env = { ...process.env, ...loadEnv(mode, parentDir, "") };
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    envDir: "../",
    server: {
      host: true,
      origin: "http://localhost:3000",
    },
    define: {
      "process.env.SERVER_URL": JSON.stringify(serverUrl),
    },
    publicDir: command === "serve" ? "../public" : false,
    build: {
      emptyOutDir: false,
      outDir: "../public",
    },
  };
});
