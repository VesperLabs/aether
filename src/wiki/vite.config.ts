import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

/** Repo root. Vite is run from the root with `--config` (see npm scripts). */
const repoRoot = path.resolve(__dirname, "../..");

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  process.env = { ...process.env, ...loadEnv(mode, repoRoot, "") };
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  /** In dev, launch the live client (Vite) instead of the last build served by the game server. */
  const gameUrl = command === "serve" ? "http://localhost:5174" : serverUrl;

  return {
    root: __dirname,
    resolve: { tsconfigPaths: true },
    plugins: [react()],
    envDir: repoRoot,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      origin: "http://localhost:3000",
    },
    define: {
      "process.env.SERVER_URL": JSON.stringify(serverUrl),
      "process.env.GAME_URL": JSON.stringify(gameUrl),
    },
    publicDir: command === "serve" ? path.join(repoRoot, "public") : false,
    build: {
      emptyOutDir: false,
      outDir: path.join(repoRoot, "public"),
    },
  };
});
