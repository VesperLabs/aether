import path from "node:path";
import { defineConfig, loadEnv, type ConfigEnv } from "vite";
import react from "@vitejs/plugin-react";
import { DEFAULT_SERVER_FPS } from "../network/sync/timing.ts";
import { getAppVersion } from "../../scripts/app-version.ts";
import { pageHostUrl } from "../../scripts/page-host-url.ts";
import { rewriteAssetUrls } from "../../scripts/assets-url.ts";
import { removeStaleBuilds } from "../../scripts/stale-builds.ts";

/** Repo root. Vite is run from the root with `--config` (see npm scripts). */
const repoRoot = path.resolve(import.meta.dirname, "../..");

export default ({ mode, command }: ConfigEnv) => {
  /* Read into a local, never process.env: loadEnv lets process.env win over the file, so writing it back
   * would pin the first values and ignore later .env edits when Vite restarts. */
  const env = loadEnv(mode, repoRoot, "");
  const shown = [
    "DEBUG",
    "SERVER_FPS",
    "SERVER_URL",
    "ASSETS_URL",
    "PEER_CLIENT_PORT",
    "PEER_CLIENT_PATH",
  ];
  const settings = shown.filter((key) => env[key]).map((key) => `${key}=${env[key]}`);
  if (env.METERED_APP_NAME) settings.push("METERED=set");
  console.log(`🛠 ${settings.join("  ")}`);

  return defineConfig({
    root: import.meta.dirname,
    /* Separate dep caches: the client and wiki dev servers run side by side and would invalidate a shared one. */
    cacheDir: path.join(repoRoot, "node_modules/.vite/client"),
    resolve: { tsconfigPaths: true },
    envDir: repoRoot,
    // Dev serves static assets from public; build writes into public — avoid copying public onto itself
    publicDir: command === "serve" ? path.join(repoRoot, "public") : false,
    plugins: [
      {
        name: "replace-url",
        transform(code, id) {
          return env.ASSETS_URL ? rewriteAssetUrls(code, env.ASSETS_URL) : code;
        },
      },
      react(),
      removeStaleBuilds(path.join(repoRoot, "public")),
    ],
    define: {
      /* Values must be JSON-serialized literals; undefined breaks esbuild in CI/Docker with no .env */
      "process.env.DEBUG": env.DEBUG === "true",
      "process.env.SERVER_FPS": JSON.stringify(env.SERVER_FPS ?? String(DEFAULT_SERVER_FPS)),
      "process.env.SERVER_URL": pageHostUrl(env.SERVER_URL ?? "", command),
      __APP_VERSION__: JSON.stringify(getAppVersion(repoRoot)),
      "process.env.ASSETS_URL": pageHostUrl(env.ASSETS_URL ?? "", command),
      "process.env.PEER_CLIENT_PORT": JSON.stringify(env.PEER_CLIENT_PORT ?? ""),
      "process.env.PEER_CLIENT_PATH": JSON.stringify(env.PEER_CLIENT_PATH ?? ""),
      "process.env.METERED_APP_NAME": JSON.stringify(env.METERED_APP_NAME ?? ""),
      "process.env.METERED_API_KEY": JSON.stringify(env.METERED_API_KEY ?? ""),
      "process.env.METERED_REGION": JSON.stringify(env.METERED_REGION ?? ""),
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
    },
    build: {
      assetsDir: "./", //puts our js files 1 directory up from the /assets folder
      emptyOutDir: false, //we dont want to delete the public folder. its where we store pics
      outDir: path.join(repoRoot, "public"),
    },
  });
};
