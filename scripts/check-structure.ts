/**
 * Structure rules from ARCHITECTURE.md that a linter can't express.
 * Run with `npm run check:structure`. Existing violations are listed in LEGACY and may only shrink:
 * an entry that no longer violates its rule fails the check, so remove it.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type Rule =
  | "banned-name"
  | "folder-case"
  | "manager-class"
  | "spec-file"
  | "tsx-without-jsx"
  | "index-logic"
  | "raw-socket-on"
  | "barrel"
  | "loose-file"
  | "big-folder";

/** Paths (relative to the repo root) that are allowed to break a rule for now. */
const LEGACY: Record<Rule, string[]> = {
  "banned-name": [],
  "folder-case": [],
  "manager-class": [],
  "spec-file": [],
  "tsx-without-jsx": [],
  "index-logic": [],
  // Files at a folder's top level that belong in a feature folder
  "loose-file": [],
  // Folders with more than MAX_FILES source files (tests excluded) that should split by feature
  "big-folder": [
    "src/client/views",
    "src/content/items",
    "src/rules/inventory",
    "src/rules/movement",
    "src/rules/npc-behavior",
    "src/ui/item",
    "src/ui/kit",
  ],
  "raw-socket-on": [
    "src/client/hud/app/app-events.ts",
    "src/client/hud/auth/login-form.tsx",
    "src/client/hud/auth/register-form.tsx",
  ],
  barrel: [
    "src/network/sync/index.ts",
    "src/rules/buffs/index.ts",
    "src/rules/character/index.ts",
    "src/rules/combat/index.ts",
    "src/rules/inventory/index.ts",
    "src/rules/loot/index.ts",
    "src/rules/movement/index.ts",
    "src/rules/npc-behavior/index.ts",
    "src/rules/party/index.ts",
    "src/rules/quests/index.ts",
    "src/rules/spells/index.ts",
    "src/rules/stats/index.ts",
    "src/rules/world/index.ts",
    "src/server/persistence/index.ts",
    "src/ui/character/index.ts",
    "src/ui/item/index.ts",
    "src/ui/kit/index.ts",
  ],
};

const ROOTS = ["src", "scripts"];
const BANNED = new Set(["utils", "helpers", "common", "misc", "lib", "shared"]);
const MAX_FILES = 12;
// Top level of src/ and of each app/layer holds only subfolders and these entry points
const TOP_LEVELS = new Set(
  ["", "server", "client", "wiki", "content", "network", "rules", "ui"].map((d) =>
    path.join("src", d),
  ),
);
const ENTRY_POINTS =
  /^(main\.tsx?|game\.tsx|app\.tsx|index\.html|vite\.config\.ts|style\.css|.*\.d\.ts|CLAUDE\.md)$/;
// Documented entry points of a single layer
const LAYER_ENTRY_POINTS = new Set([
  "src/rules/events.ts",
  "src/network/commands.ts",
  "src/network/messages.ts",
]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REEXPORT = /export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["'][^"']+["'];?/g;
const IMPORT = /import\s+(type\s+)?([^;"']*?\sfrom\s*)?["'][^"']+["'];?/g;
const EXPORT_LIST = /export\s+(type\s+)?\{[^}]*\};?/g;
// Only the dispatchers listen on sockets; tests are clients and may listen too
const SOCKET_DISPATCHERS = ["src/server/net/", "src/client/net/"];
const SOCKET_ON = /\bsocket\??\.on\(/;
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
// `<Tag`, `<tag`, `<>` that follow an operator or whitespace, so generics like `useState<string>` don't match
const JSX = /(^|[\s(?:&|,{=>])<([A-Za-z][\w.]*(\s|\/?>)|>)/m;

const found = new Map<Rule, Set<string>>();
const report = (rule: Rule, file: string) => {
  if (!found.has(rule)) found.set(rule, new Set());
  found.get(rule)!.add(file);
};

function check(dir: string) {
  const files = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
  const sources = files.filter((e) => /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name));
  if (dir.startsWith("src") && sources.length > MAX_FILES) report("big-folder", dir);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkFolder(full, entry.name);
      check(full);
    } else {
      checkFile(full, entry.name);
    }
  }
}

function checkFolder(full: string, name: string) {
  if (BANNED.has(name)) {
    report("banned-name", full);
  }
  if (!KEBAB.test(name)) report("folder-case", full);
}

function checkFile(full: string, name: string) {
  if (
    TOP_LEVELS.has(path.dirname(full)) &&
    !ENTRY_POINTS.test(name) &&
    !LAYER_ENTRY_POINTS.has(full)
  ) {
    report("loose-file", full);
  }
  const [stem, ...ext] = name.split(".");
  if (BANNED.has(stem)) report("banned-name", full);
  if (ext.includes("spec")) report("spec-file", full);
  if (!/\.(tsx?|jsx?)$/.test(name)) return;

  const text = readFileSync(full, "utf8");
  if (/\bclass\s+\w*Manager\b/.test(text)) report("manager-class", full);
  if (
    SOCKET_ON.test(text.replace(COMMENTS, "")) &&
    !/\.test\.tsx?$/.test(name) &&
    !SOCKET_DISPATCHERS.some((dir) => full.startsWith(dir))
  ) {
    report("raw-socket-on", full);
  }
  if (name.endsWith(".tsx") && !JSX.test(text.replace(COMMENTS, ""))) {
    report("tsx-without-jsx", full);
  }
  if (/^index\.(tsx?|jsx?)$/.test(name)) {
    const rest = text
      .replace(COMMENTS, "")
      .replace(REEXPORT, "")
      .replace(EXPORT_LIST, "")
      .replace(IMPORT, "");
    if (rest.trim()) report("index-logic", full);
    else report("barrel", full);
  }
}

ROOTS.forEach((root) => check(root));

let failed = false;
for (const [rule, allowed] of Object.entries(LEGACY) as [Rule, string[]][]) {
  const hits = found.get(rule) ?? new Set<string>();
  for (const file of [...hits].sort()) {
    if (!allowed.includes(file)) {
      console.error(`${file}: breaks "${rule}" (see ARCHITECTURE.md)`);
      failed = true;
    }
  }
  for (const file of allowed) {
    if (!hits.has(file)) {
      console.error(
        `${file}: no longer breaks "${rule}", remove it from LEGACY in scripts/check-structure.ts`,
      );
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("Structure OK");
