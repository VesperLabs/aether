import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { DRAW_MODELS } from "./draw-models";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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

type GeminiPart = { inlineData?: { data: string } };

const callGemini = async (
  apiKey: string,
  { model, prompt, images }: { model: string; prompt: string; images: string[] },
) => {
  const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            ...images.map((data) => ({ inline_data: { mime_type: "image/png", data } })),
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "1:1" },
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? `Gemini said ${response.status}`);
  const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
  const drawn = parts.find((part) => part.inlineData)?.inlineData?.data;
  if (!drawn) throw new Error("Gemini returned no image");
  return drawn;
};

/** `POST /api/draw`: keeps the key on this machine, out of the browser. */
export const geminiPlugin = (apiKey: string | undefined): Plugin => ({
  name: "sprite-lab-gemini",
  configureServer(server) {
    server.middlewares.use("/api/draw", async (req, res) => {
      if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
      if (!apiKey) return reply(res, 500, { error: "GEMINI_API_KEY is not in .env" });
      try {
        const body = await readBody(req);
        if (!DRAW_MODELS.some(({ value }) => value === body.model)) {
          return reply(res, 400, { error: "Unknown model" });
        }
        reply(res, 200, { image: await callGemini(apiKey, body) });
      } catch (error) {
        reply(res, 502, { error: error instanceof Error ? error.message : "Draw failed" });
      }
    });
  },
});
