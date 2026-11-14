import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { readJson, reply } from "./dev-json";

const CARD_FOLDER = "assets/cards";
const NAME_PATTERN = /^[a-z0-9-]+$/;

type Face = { x: number; y: number; size: number };

const isFace = (face: Face): face is Face =>
  [face?.x, face?.y, face?.size].every(Number.isInteger) && face.size > 0;

/** Saves monster cards: a finished card PNG (frame, night backdrop and face), and where each sprite's face was cut from. */
export const cardPlugin = (repoRoot: string): Plugin => {
  const folder = path.join(repoRoot, "public", CARD_FOLDER);
  const facesFile = path.join(folder, "faces.json");

  return {
    name: "sprite-lab-cards",
    configureServer(server) {
      server.middlewares.use("/api/cards", async (req, res) => {
        try {
          if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
          const { name, texture, face, image } = await readJson(req);
          if (!NAME_PATTERN.test(name) || !NAME_PATTERN.test(texture) || !isFace(face)) {
            return reply(res, 400, { error: "Not a card" });
          }
          await mkdir(folder, { recursive: true });
          const faces = JSON.parse(await readFile(facesFile, "utf8").catch(() => "{}"));
          faces[texture] = face;
          await writeFile(path.join(folder, `${name}.png`), Buffer.from(image, "base64"));
          await writeFile(facesFile, `${JSON.stringify(faces, null, 2)}\n`);
          reply(res, 200, {});
        } catch (error) {
          reply(res, 500, { error: error instanceof Error ? error.message : "Save failed" });
        }
      });
    },
  };
};
