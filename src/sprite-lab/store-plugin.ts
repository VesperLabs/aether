import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";

const ATLAS_FOLDER = "assets/atlas";
const ID_PATTERN = /^[0-9a-f-]{36}$/;

/** The file behind a sheet's `src`, or undefined for anything outside the atlas folder. */
export const resolveSheetPath = (publicDir: string, src: string) => {
  const atlas = path.join(publicDir, ATLAS_FOLDER);
  const file = path.resolve(publicDir, src);
  return file.startsWith(atlas + path.sep) && file.endsWith(".png") ? file : undefined;
};

type WeaponPosePlacement = { frame: unknown; hand: unknown; x: unknown; y: unknown };

/** Moves one hand on one frame of a parsed `weapon.json`. False if there's no such pose. */
export const placeWeapon = (
  atlas: { offsets: { human: Record<string, Record<string, { x: number; y: number }>> } },
  { frame, hand, x, y }: WeaponPosePlacement,
) => {
  const { human } = atlas.offsets;
  const hands = Object.hasOwn(human, String(frame)) ? human[String(frame)] : undefined;
  const pose = hands && Object.hasOwn(hands, String(hand)) ? hands[String(hand)] : undefined;
  if (!pose || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  pose.x = x as number;
  pose.y = y as number;
  return true;
};

const readJson = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
};

const reply = (res: ServerResponse, status: number, body: object) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
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

      server.middlewares.use("/api/weapon-poses", async (req, res) => {
        try {
          if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
          const file = path.join(publicDir, ATLAS_FOLDER, "weapon.json");
          const atlas = JSON.parse(await readFile(file, "utf8"));
          if (!placeWeapon(atlas, await readJson(req))) {
            return reply(res, 400, { error: "Not a weapon pose" });
          }
          await writeFile(file, `${JSON.stringify(atlas, null, 2)}\n`);
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
