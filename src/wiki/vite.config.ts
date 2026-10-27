import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { getAppVersion } from "../../scripts/app-version";
import { removeStaleBuilds } from "../../scripts/stale-builds";

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
    /* Separate dep caches: the client and wiki dev servers run side by side and would invalidate a shared one. */
    cacheDir: path.join(repoRoot, "node_modules/.vite/wiki"),
    resolve: { tsconfigPaths: true },
    plugins: [react(), removeStaleBuilds(path.join(repoRoot, "public"))],
    envDir: repoRoot,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      origin: "http://localhost:3000",
    },
    define: {
      "process.env.SERVER_URL": JSON.stringify(serverUrl),
      __APP_VERSION__: JSON.stringify(getAppVersion(repoRoot)),
      "process.env.GAME_URL": JSON.stringify(gameUrl),
    },
    publicDir: command === "serve" ? path.join(repoRoot, "public") : false,
    build: {
      emptyOutDir: false,
      outDir: path.join(repoRoot, "public"),
    },
  };
});
