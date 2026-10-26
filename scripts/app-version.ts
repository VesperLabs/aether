import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The version shown in the game and the wiki: `package.json` version plus the short commit.
 * Docker builds have no `.git`, so CI passes the commit as `GIT_SHA`; Render sets `RENDER_GIT_COMMIT`.
 */
export function getAppVersion(repoRoot: string): string {
  const { version } = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const sha = (process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || gitSha(repoRoot)).slice(
    0,
    7,
  );
  return sha ? `v${version} (${sha})` : `v${version}`;
}

function gitSha(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}
