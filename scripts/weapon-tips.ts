/**
 * Measures every weapon's tip from its art and writes `src/content/assets/weapon-tips.json`, the
 * only source of how far a melee weapon reaches (see `getMeleeRange`).
 *
 *   npx tsx scripts/weapon-tips.ts          write the file
 *   npx tsx scripts/weapon-tips.ts --check  fail if the file is out of date with the art
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { WEAPON_GRIP } from "../src/content/assets/weapon-tips";

const repoRoot = path.resolve(__dirname, "..");
const ART_DIR = path.join(repoRoot, "public/assets/atlas/hands");
const OUT_FILE = path.join(repoRoot, "src/content/assets/weapon-tips.json");

/** The opaque pixel farthest from the grip. */
function measureTip(file: string) {
  const png = PNG.sync.read(fs.readFileSync(file));
  let tip: { x: number; y: number } = { ...WEAPON_GRIP };
  let best = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      const d = (x - WEAPON_GRIP.x) ** 2 + (y - WEAPON_GRIP.y) ** 2;
      if (d > best) {
        best = d;
        tip = { x, y };
      }
    }
  }
  return tip;
}

function measureAll() {
  const tips: Record<string, { x: number; y: number }> = {};
  for (const name of fs.readdirSync(ART_DIR).sort()) {
    if (!/^weapon-[a-z0-9-]+\.png$/.test(name)) continue;
    tips[name.replace(/\.png$/, "")] = measureTip(path.join(ART_DIR, name));
  }
  return JSON.stringify(tips, null, 2) + "\n";
}

const next = measureAll();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";
  if (current !== next) {
    console.error(
      "weapon-tips.json is out of date with the weapon art. Run `npm run weapon-tips`.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT_FILE, next);
  console.log(`Wrote ${path.relative(repoRoot, OUT_FILE)}`);
}
