/*
 * Opens the game in a Chrome that DevTools tools can attach to (the chrome-devtools MCP in
 * `.mcp.json`), once the client dev server answers. It uses its own profile, kept in
 * `.chrome-debug/`: Chrome refuses remote debugging on the default one. Set NO_DEBUG_CHROME=1 to skip.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const CLIENT_URL = "http://localhost:5174";
const DEBUG_PORT = 9222;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = path.resolve(import.meta.dirname, "../.chrome-debug");

/** Stays running, so `concurrently -k` doesn't stop the other dev servers when this is done. */
const idle = () => setInterval(() => {}, 1 << 30);

async function waitForClient() {
  for (;;) {
    try {
      await fetch(CLIENT_URL);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function isDebugChromeOpen() {
  try {
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.NO_DEBUG_CHROME || !existsSync(CHROME)) {
    console.log("Debug Chrome skipped");
    return idle();
  }
  await waitForClient();
  if (await isDebugChromeOpen()) {
    console.log(`Debug Chrome already open on port ${DEBUG_PORT}`);
    return idle();
  }
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      CLIENT_URL,
    ],
    { detached: true, stdio: "ignore" },
  );
  chrome.unref();
  console.log(`Debug Chrome opened ${CLIENT_URL}, DevTools port ${DEBUG_PORT}`);
  idle();
}

void main();
