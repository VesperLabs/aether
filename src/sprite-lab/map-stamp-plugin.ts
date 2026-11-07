import { readdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";
import { z } from "zod";
import { Stamp } from "./map-stamps";

const LIBRARY_FILE = "src/sprite-lab/map-stamps.json";
const MAPS_FOLDER = "public/assets/tilemaps";

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
};

const reply = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

export const readStampLibrary = async (repoRoot: string): Promise<Stamp[]> => {
  const text = await readFile(path.join(repoRoot, LIBRARY_FILE), "utf8").catch(() => "[]");
  return z.array(Stamp).parse(JSON.parse(text));
};

/**
 * `GET /api/map-stamps` lists the stamp library and `PUT` replaces it, kept in the repo so stamps
 * are shared. `GET /api/map-sources` lists the maps stamps can be cut from.
 */
export const mapStampPlugin = (repoRoot: string): Plugin => ({
  name: "sprite-lab-map-stamps",
  configureServer(server) {
    server.middlewares.use("/api/map-stamps", async (req, res) => {
      if (req.method === "GET") return reply(res, 200, await readStampLibrary(repoRoot));
      if (req.method !== "PUT") return reply(res, 405, { error: "GET or PUT only" });
      const library = z.array(Stamp).safeParse(await readBody(req).catch(() => undefined));
      if (!library.success) return reply(res, 400, { error: library.error.message });
      const ids = library.data.map(({ id }) => id);
      if (new Set(ids).size !== ids.length) return reply(res, 400, { error: "Duplicate stamp id" });
      await writeFile(
        path.join(repoRoot, LIBRARY_FILE),
        `${JSON.stringify(library.data, null, 2)}\n`,
      );
      reply(res, 200, library.data);
    });
    server.middlewares.use("/api/map-sources", async (_req, res) => {
      const names = await readdir(path.join(repoRoot, MAPS_FOLDER));
      reply(res, 200, names.filter((name) => name.endsWith(".json")).sort());
    });
  },
});
