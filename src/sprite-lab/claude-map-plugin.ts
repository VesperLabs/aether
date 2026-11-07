import { spawn } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import type { Plugin } from "vite";
import {
  buildMapPrompt,
  MAP_REPLY_SCHEMA,
  buildSystemPrompt,
  cleanStamps,
  MapReply,
  MapRequest,
  replyToGrid,
} from "./map-prompt";
import { readStampLibrary } from "./map-stamp-plugin";
import { blockedTiles, normalizeGrid } from "./map-terrain";

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
};

const reply = (res: ServerResponse, status: number, body: object) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

/**
 * Runs Claude Code headless, so requests use the user's Claude subscription rather than an API key.
 * It runs from the temp folder with no tools, so it can't read or change the repo.
 */
const askClaude = (bin: string, system: string, prompt: string) =>
  new Promise<MapReply>((resolve, reject) => {
    const args = [
      "-p",
      "--output-format",
      "json",
      "--tools",
      "",
      "--no-session-persistence",
      "--system-prompt",
      system,
      "--json-schema",
      JSON.stringify(MAP_REPLY_SCHEMA),
    ];
    const child = spawn(bin, args, { cwd: tmpdir() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) =>
      reject(
        new Error(
          `Couldn't run "${bin}" (${error.message}). Install Claude Code or set CLAUDE_BIN.`,
        ),
      ),
    );
    child.on("close", (code) => {
      try {
        const result = JSON.parse(stdout);
        if (result.is_error) throw new Error(result.result || "Claude returned an error");
        resolve(MapReply.parse(result.structured_output));
      } catch (error) {
        const detail = stderr.trim() || (error instanceof Error ? error.message : "");
        reject(new Error(`Claude Code exited ${code}: ${detail}`));
      }
    });
    child.stdin.end(prompt);
  });

/** `POST /api/map`: lays out or revises a terrain grid and its stamps. */
/** Where the Claude Code installer puts it, for shells that don't have it on PATH. */
const INSTALLED_BIN = path.join(homedir(), ".local/bin/claude");

const defaultBin = () => (existsSync(INSTALLED_BIN) ? INSTALLED_BIN : "claude");

export const claudeMapPlugin = (repoRoot: string, bin = defaultBin()): Plugin => ({
  name: "sprite-lab-claude-map",
  configureServer(server) {
    server.middlewares.use("/api/map", async (req, res) => {
      if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
      const request = MapRequest.safeParse(await readBody(req).catch(() => undefined));
      if (!request.success) return reply(res, 400, { error: request.error.message });
      const { width, height } = request.data;
      try {
        const library = await readStampLibrary(repoRoot);
        const answer = await askClaude(
          bin,
          buildSystemPrompt(library),
          buildMapPrompt(request.data),
        );
        const grid = normalizeGrid(replyToGrid(answer), width + 1, height + 1);
        const stamps = cleanStamps(answer.stamps, library, blockedTiles(grid), width);
        reply(res, 200, { grid, stamps, notes: answer.notes });
      } catch (error) {
        reply(res, 502, { error: error instanceof Error ? error.message : "Map failed" });
      }
    });
  },
});
