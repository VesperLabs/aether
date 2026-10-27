import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * The client and wiki build into `public/` next to the tracked art (`emptyOutDir: false`),
 * so each build's hashed `index-*` files would pile up. Delete the last build's before writing.
 */
export function removeStaleBuilds(publicDir: string): Plugin {
  return {
    name: "remove-stale-builds",
    apply: "build",
    buildStart() {
      for (const dir of [publicDir, path.join(publicDir, "assets")]) {
        for (const name of readdirSync(dir)) {
          if (name.startsWith("index-")) rmSync(path.join(dir, name));
        }
      }
    },
  };
}
