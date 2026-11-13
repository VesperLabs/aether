import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { geminiPlugin } from "./gemini-plugin";
import { cardPlugin } from "./card-plugin";
import { storePlugin } from "./store-plugin";

const repoRoot = path.resolve(import.meta.dirname, "../..");

/** Local dev tool: only ever served, never built or deployed. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  return {
    root: import.meta.dirname,
    cacheDir: path.join(repoRoot, "node_modules/.vite/sprite-lab"),
    resolve: { tsconfigPaths: true },
    plugins: [
      react(),
      geminiPlugin(env.GEMINI_API_KEY),
      storePlugin(repoRoot),
      cardPlugin(repoRoot),
    ],
    publicDir: path.join(repoRoot, "public"),
    define: { __APP_VERSION__: JSON.stringify("dev") },
    server: { port: 5175, strictPort: true },
  };
});
