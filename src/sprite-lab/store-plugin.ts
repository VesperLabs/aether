import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";
import type { BodyData } from "@/content";
import { readJson, reply } from "./dev-json";

/** The most a body's hit box or head may measure, in pixels. */
const MAX_BODY_PIXELS = 256;

const ATLAS_FOLDER = "assets/atlas";
const ID_PATTERN = /^[0-9a-f-]{36}$/;

/** The file behind a sheet's `src`, or undefined for anything outside the atlas folder. */
export const resolveSheetPath = (publicDir: string, src: string) => {
  const atlas = path.join(publicDir, ATLAS_FOLDER);
  const file = path.resolve(publicDir, src);
  return file.startsWith(atlas + path.sep) && file.endsWith(".png") ? file : undefined;
};

const isWhole = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

type HandPoints = Record<string, Record<string, { x: number; y: number }>>;

/** A body's name, as its file and sheet are named: camelCase, like `wolf` or `earthElemental`. */
const BODY_PATTERN = /^[a-z][a-zA-Z]*$/;

/** Whether `points` is hand points for the same frames as `human`'s, every hand at whole pixels. */
const isHandPoints = (points: unknown, human: HandPoints): points is HandPoints => {
  if (typeof points !== "object" || points === null || Array.isArray(points)) return false;
  const frames = Object.keys(points);
  const isPoint = (pose: unknown) =>
    typeof pose === "object" &&
    pose !== null &&
    isWhole((pose as { x: unknown }).x, -MAX_BODY_PIXELS, MAX_BODY_PIXELS) &&
    isWhole((pose as { y: unknown }).y, -MAX_BODY_PIXELS, MAX_BODY_PIXELS);
  return (
    frames.length === Object.keys(human).length &&
    frames.every(
      (frame) =>
        Object.hasOwn(human, frame) &&
        Object.values((points as Record<string, Record<string, unknown>>)[frame] ?? {}).every(
          isPoint,
        ),
    )
  );
};

/** Whether `data` is a whole body file: flags, shape, portrait, and hand points if any. */
const isBodyData = (data: unknown, human: HandPoints): data is BodyData => {
  if (!data || typeof data !== "object") return false;
  const {
    leavesGrave,
    attackAnims,
    hitBox,
    feetRadius,
    headY,
    spriteAboveFeet,
    portraitRect,
    habitat,
    hands,
    ...extra
  } = data as Record<string, unknown>;
  const rect = portraitRect as unknown[] | undefined;
  const box = hitBox as Record<string, unknown> | undefined;
  return (
    Object.keys(extra).length === 0 &&
    (attackAnims === undefined || typeof attackAnims === "boolean") &&
    (leavesGrave === undefined || typeof leavesGrave === "boolean") &&
    (habitat === "land" || habitat === "water" || habitat === "air") &&
    Array.isArray(rect) &&
    rect.length === 4 &&
    rect.every((value) => isWhole(value, 0, 4096)) &&
    isWhole(spriteAboveFeet, -MAX_BODY_PIXELS, MAX_BODY_PIXELS) &&
    (hands === undefined || isHandPoints(hands, human)) &&
    !!box &&
    isWhole(box.width, 1, MAX_BODY_PIXELS) &&
    isWhole(box.height, 1, MAX_BODY_PIXELS) &&
    isWhole(feetRadius, 1, MAX_BODY_PIXELS / 2) &&
    isWhole(headY, -MAX_BODY_PIXELS, 0)
  );
};

/**
 * The file a known body's change should be written as, or undefined if refused. `attackAnims` is
 * only kept when on, and the human always keeps its hands: players hold weapons.
 */
export const toBodyFile = (
  bodies: Record<string, BodyData>,
  { body, data }: { body: unknown; data: unknown },
): BodyData | undefined => {
  if (typeof body !== "string" || !BODY_PATTERN.test(body) || !Object.hasOwn(bodies, body)) return;
  const human = bodies.human?.hands as HandPoints | undefined;
  if (!human || !isBodyData(data, human)) return;
  const {
    leavesGrave,
    attackAnims,
    hitBox,
    feetRadius,
    headY,
    spriteAboveFeet,
    portraitRect,
    habitat,
    hands,
  } = data;
  if (body === "human" && !hands) return;
  /* The same key order as the files, so a save only shows what changed */
  return {
    ...(leavesGrave && { leavesGrave }),
    ...(attackAnims && { attackAnims }),
    hitBox: { width: hitBox.width, height: hitBox.height },
    feetRadius,
    headY,
    spriteAboveFeet,
    portraitRect: [...portraitRect],
    habitat,
    ...(hands && { hands }),
  };
};

/** Every body's file in `folder`, by race. */
const readBodies = async (folder: string) => {
  const names = (await readdir(folder)).filter((name) => name.endsWith(".json"));
  const files = await Promise.all(
    names.map(async (name) => [
      name.slice(0, -".json".length),
      JSON.parse(await readFile(path.join(folder, name), "utf8")) as BodyData,
    ]),
  );
  return Object.fromEntries(files) as Record<string, BodyData>;
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

      /* Every body's file, read and written by the body window */
      server.middlewares.use("/api/bodies", async (req, res) => {
        try {
          const folder = path.join(repoRoot, "src/content/bodies");
          const bodies = await readBodies(folder);
          if (req.method === "GET") return reply(res, 200, bodies);
          if (req.method !== "POST") return reply(res, 405, { error: "GET or POST only" });
          const change = await readJson(req);
          const file = toBodyFile(bodies, change);
          if (!file) return reply(res, 400, { error: "Not a body" });
          const target = path.join(folder, `${change.body}.json`);
          await writeFile(target, `${JSON.stringify(file, null, 2)}\n`);
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
