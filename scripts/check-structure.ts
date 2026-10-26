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
  | "index-logic";

/** Paths (relative to the repo root) that are allowed to break a rule for now. */
const LEGACY: Record<Rule, string[]> = {
  "banned-name": [],
  "folder-case": [],
  "manager-class": [],
  "spec-file": [],
  "tsx-without-jsx": [],
  "index-logic": [],
};

const ROOTS = ["src", "scripts"];
const BANNED = new Set(["utils", "helpers", "common", "misc", "lib"]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REEXPORT = /export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["'][^"']+["'];?/g;
const IMPORT = /import\s+(type\s+)?([^;"']*?\sfrom\s*)?["'][^"']+["'];?/g;
const EXPORT_LIST = /export\s+(type\s+)?\{[^}]*\};?/g;
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
// `<Tag`, `<tag`, `<>` that follow an operator or whitespace, so generics like `useState<string>` don't match
const JSX = /(^|[\s(?:&|,{=>])<([A-Za-z][\w.]*(\s|\/?>)|>)/m;

const found = new Map<Rule, Set<string>>();
const report = (rule: Rule, file: string) => {
  if (!found.has(rule)) found.set(rule, new Set());
  found.get(rule)!.add(file);
};

function check(dir: string) {
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
  if (BANNED.has(name) || (name === "shared" && full !== path.join("src", "shared"))) {
    report("banned-name", full);
  }
  if (!KEBAB.test(name)) report("folder-case", full);
}

function checkFile(full: string, name: string) {
  const [stem, ...ext] = name.split(".");
  if (BANNED.has(stem)) report("banned-name", full);
  if (ext.includes("spec")) report("spec-file", full);
  if (!/\.(tsx?|jsx?)$/.test(name)) return;

  const text = readFileSync(full, "utf8");
  if (/\bclass\s+\w*Manager\b/.test(text)) report("manager-class", full);
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
