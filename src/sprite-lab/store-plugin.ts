import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";
import { readJson, reply } from "./dev-json";

const ATLAS_FOLDER = "assets/atlas";
const ID_PATTERN = /^[0-9a-f-]{36}$/;

/** The file behind a sheet's `src`, or undefined for anything outside the atlas folder. */
export const resolveSheetPath = (publicDir: string, src: string) => {
  const atlas = path.join(publicDir, ATLAS_FOLDER);
  const file = path.resolve(publicDir, src);
  return file.startsWith(atlas + path.sep) && file.endsWith(".png") ? file : undefined;
};

type HandPoints = Record<string, Record<string, { x: number; y: number }>>;

/** A body's name as `weapon.json` keys it: its sheet's texture, like `wolf`. */
const BODY_PATTERN = /^[a-z][a-z-]*$/;

/** Whether `points` is hand points for the same frames as `human`'s, every hand at whole pixels. */
const isHandPoints = (points: unknown, human: HandPoints): points is HandPoints => {
  if (typeof points !== "object" || points === null || Array.isArray(points)) return false;
  const frames = Object.keys(points);
  const isWhole = (pose: unknown) =>
    typeof pose === "object" &&
    pose !== null &&
    Number.isInteger((pose as { x: unknown }).x) &&
    Number.isInteger((pose as { y: unknown }).y);
  return (
    frames.length === Object.keys(human).length &&
    frames.every(
      (frame) =>
        Object.hasOwn(human, frame) &&
        Object.values((points as Record<string, Record<string, unknown>>)[frame] ?? {}).every(
          isWhole,
        ),
    )
  );
};

/**
 * Replaces a body's hand points, or with `null` takes its hands away. The human's always stay:
 * players hold weapons. False if refused.
 */
export const setBodyHandPoints = (
  atlas: { offsets: Record<string, HandPoints> },
  { body, points }: { body: unknown; points: unknown },
) => {
  const { offsets } = atlas;
  if (typeof body !== "string" || !BODY_PATTERN.test(body)) return false;
  if (points === null) {
    if (body === "human") return false;
    delete offsets[body];
    return true;
  }
  if (!isHandPoints(points, offsets.human)) return false;
  offsets[body] = points;
  return true;
};

/** Switches one known body's attack animations in a parsed `bodies.json`. False if refused. */
export const setBodyFlags = (
  bodies: Record<string, { attackAnims?: boolean }>,
  { body, attackAnims }: { body: unknown; attackAnims: unknown },
) => {
  if (typeof body !== "string" || !Object.hasOwn(bodies, body)) return false;
  if (typeof attackAnims !== "boolean") return false;
  const { attackAnims: _old, ...rest } = bodies[body];
  bodies[body] = attackAnims ? { ...rest, attackAnims } : rest;
  return true;
};

const decodePng = (image: string) => Buffer.from(image, "base64");

const listGenerations = async (folder: string) => {
  const names = await readdir(folder).catch(() => [] as string[]);
  const files = names.filter((name) => name.endsWith(".json"));
  const items = await Promise.all(
    files.map(async (name) => JSON.parse(await readFile(path.join(folder, name), "utf8"))),
  );
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

/** Generations on disk, and merging one into a sheet. Takes writes only as JSON from this page. */
export const storePlugin = (repoRoot: string): Plugin => {
  const folder = path.join(repoRoot, ".sprite-lab/generations");
  const publicDir = path.join(repoRoot, "public");

  return {
    name: "sprite-lab-store",
    configureServer(server) {
      server.middlewares.use("/api/generations", async (req, res) => {
        try {
          const [, name = ""] = /^\/([^?]*)/.exec(req.url ?? "") ?? [];
          const id = name.replace(/\.png$/, "");
          if (req.method === "GET" && !name) {
            return reply(res, 200, { generations: await listGenerations(folder) });
          }
          if (req.method === "POST" && !name) {
            const { image, ...meta } = await readJson(req);
            const generation = {
              ...meta,
              id: randomUUID(),
              createdAt: new Date().toISOString(),
            };
            await mkdir(folder, { recursive: true });
            await writeFile(path.join(folder, `${generation.id}.png`), decodePng(image));
            await writeFile(path.join(folder, `${generation.id}.json`), JSON.stringify(generation));
            return reply(res, 200, { generation });
          }
          if (!ID_PATTERN.test(id)) return reply(res, 404, { error: "Not found" });
          if (req.method === "GET") {
            res.setHeader("Content-Type", "image/png");
            return res.end(await readFile(path.join(folder, `${id}.png`)));
          }
          if (req.method === "POST") {
            const { column, row } = await readJson(req);
            if (!Number.isInteger(column) || !Number.isInteger(row)) {
              return reply(res, 400, { error: "Not a frame" });
            }
            const generation = {
              ...JSON.parse(await readFile(path.join(folder, `${id}.json`), "utf8")),
              frame: { column, row },
              id: randomUUID(),
              createdAt: new Date().toISOString(),
            };
            await copyFile(
              path.join(folder, `${id}.png`),
              path.join(folder, `${generation.id}.png`),
            );
            await writeFile(path.join(folder, `${generation.id}.json`), JSON.stringify(generation));
            return reply(res, 200, { generation });
          }
          if (req.method === "PUT") {
            const { image } = await readJson(req);
            const file = path.join(folder, `${id}.json`);
            const generation = {
              ...JSON.parse(await readFile(file, "utf8")),
              updatedAt: new Date().toISOString(),
            };
            await writeFile(path.join(folder, `${id}.png`), decodePng(image));
            await writeFile(file, JSON.stringify(generation));
            return reply(res, 200, { generation });
          }
          if (req.method === "DELETE") {
            await rm(path.join(folder, `${id}.png`), { force: true });
            await rm(path.join(folder, `${id}.json`), { force: true });
            return reply(res, 200, {});
          }
          reply(res, 405, { error: "Not allowed" });
        } catch (error) {
          reply(res, 500, { error: error instanceof Error ? error.message : "Store failed" });
        }
      });

      server.middlewares.use("/api/hand-points", async (req, res) => {
        try {
          if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
          const file = path.join(publicDir, ATLAS_FOLDER, "weapon.json");
          const atlas = JSON.parse(await readFile(file, "utf8"));
          if (!setBodyHandPoints(atlas, await readJson(req))) {
            return reply(res, 400, { error: "Not hand points for a body" });
          }
          await writeFile(file, `${JSON.stringify(atlas, null, 2)}\n`);
          reply(res, 200, {});
        } catch (error) {
          reply(res, 500, { error: error instanceof Error ? error.message : "Save failed" });
        }
      });

      /* Each body's flags, read and switched by the NPC editor */
      server.middlewares.use("/api/body-flags", async (req, res) => {
        try {
          const file = path.join(repoRoot, "src/content/bodies/bodies.json");
          const bodies = JSON.parse(await readFile(file, "utf8"));
          if (req.method === "GET") return reply(res, 200, bodies);
          if (req.method !== "POST") return reply(res, 405, { error: "GET or POST only" });
          if (!setBodyFlags(bodies, await readJson(req))) {
            return reply(res, 400, { error: "Not a body's flag" });
          }
          await writeFile(file, `${JSON.stringify(bodies, null, 2)}\n`);
          reply(res, 200, {});
        } catch (error) {
          reply(res, 500, { error: error instanceof Error ? error.message : "Save failed" });
        }
      });

      server.middlewares.use("/api/sheets", async (req, res) => {
        try {
          if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
          const { src, image } = await readJson(req);
          const file = resolveSheetPath(publicDir, String(src));
          if (!file || !(await stat(file)).isFile()) {
            return reply(res, 400, { error: "Not an atlas sheet" });
          }
          await writeFile(file, decodePng(image));
          reply(res, 200, {});
        } catch (error) {
          reply(res, 500, { error: error instanceof Error ? error.message : "Merge failed" });
        }
      });
    },
  };
};
