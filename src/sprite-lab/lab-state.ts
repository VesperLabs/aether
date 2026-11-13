import { DRAW_MODELS, START_MODEL } from "./draw-models";
import { CORE_PROMPTS, START_CORE_PROMPT, type CorePromptId } from "./core-prompts";
import {
  BASE_SHEETS,
  getLayerSheets,
  HUMAN_LAYERS,
  WEAPON_SHEETS,
  parseLook,
  type HumanLayer,
} from "./sheets";

export const ZOOMS = [1, 2, 3, 4];

/** A cell of the sheet. */
export type Frame = { column: number; row: number };

/** A frame Gemini is drawing right now. */
export type ActiveDraw = { src: string; frame: Frame };

/** Everything on screen; kept in the URL so it survives a refresh and can be linked. */
export interface LabState {
  /** The body's texture, as `texture|tint` when its skin is tinted. */
  atlas: string;
  /** Leaves the atlas out of the view. It still sets the sheet's size, and can still be edited. */
  atlasHidden: boolean;
  zoom: number;
  /** The layer the drawer edits; the atlas itself when unset. */
  target?: HumanLayer;
  frame?: Frame;
  model: string;
  prompt: string;
  /** Which core prompt tab is open. */
  promptTab: CorePromptId;
  /** The sheet a wearable copies; empty uses the one being edited. */
  wearableSheet: string;
  /** Whether the monster card panel is open. */
  card: boolean;
  /** The weapon being placed; empty with the weapon panel closed. */
  weapon: string;
  /** Each layer's sheet, as `texture|tint` when tinted; empty for none. */
  layers: Record<HumanLayer, string>;
}

const START_TEXTURES: Partial<Record<HumanLayer, string>> = {
  chest: "human-male-chest-bare",
  hair: "human-hair-1",
  face: "human-face-1",
};

const startTexture = (layer: HumanLayer) => START_TEXTURES[layer] ?? "";

const START_ATLAS = "human";
const START_ZOOM = 2;

const parseFrame = (value: string | null): Frame | undefined => {
  const match = /^(\d+),(\d+)$/.exec(value ?? "");
  return match ? { column: Number(match[1]), row: Number(match[2]) } : undefined;
};

/** A hand-edited or outdated link falls back to the start value, one param at a time. */
export const parseLabState = (search: string): LabState => {
  const params = new URLSearchParams(search);
  const atlas = params.get("atlas") ?? "";
  const zoom = Number(params.get("zoom"));
  const model = params.get("model");
  const target = HUMAN_LAYERS.find((layer) => layer === params.get("target"));
  return {
    atlas: BASE_SHEETS.some(({ texture }) => texture === parseLook(atlas).texture)
      ? atlas
      : START_ATLAS,
    atlasHidden: params.has("no-atlas"),
    zoom: ZOOMS.includes(zoom) ? zoom : START_ZOOM,
    target,
    frame: parseFrame(params.get("frame")),
    model: DRAW_MODELS.some(({ value }) => value === model) ? (model as string) : START_MODEL,
    prompt: params.get("prompt") ?? "",
    promptTab: CORE_PROMPTS.find(({ id }) => id === params.get("tab"))?.id ?? START_CORE_PROMPT,
    wearableSheet: params.get("wearable") ?? "",
    card: params.has("card"),
    weapon: WEAPON_SHEETS.find(({ texture }) => texture === params.get("weapon"))?.texture ?? "",
    layers: Object.fromEntries(
      HUMAN_LAYERS.map((layer) => {
        const texture = params.get(layer);
        /* An empty value is a cleared layer. */
        const known =
          texture === "" ||
          getLayerSheets(layer).some((sheet) => sheet.texture === parseLook(texture ?? "").texture);
        return [layer, known && texture !== null ? texture : startTexture(layer)];
      }),
    ) as Record<HumanLayer, string>,
  };
};

/** Only what differs from the start, so the URL stays short. */
export const serializeLabState = ({
  atlas,
  atlasHidden,
  zoom,
  target,
  frame,
  model,
  prompt,
  promptTab,
  wearableSheet,
  weapon,
  card,
  layers,
}: LabState) => {
  const params = new URLSearchParams();
  if (atlas !== START_ATLAS) params.set("atlas", atlas);
  if (atlasHidden) params.set("no-atlas", "");
  if (zoom !== START_ZOOM) params.set("zoom", String(zoom));
  if (target) params.set("target", target);
  if (frame) params.set("frame", `${frame.column},${frame.row}`);
  if (model !== START_MODEL) params.set("model", model);
  if (prompt) params.set("prompt", prompt);
  if (promptTab !== START_CORE_PROMPT) params.set("tab", promptTab);
  if (wearableSheet) params.set("wearable", wearableSheet);
  if (weapon) params.set("weapon", weapon);
  if (card) params.set("card", "");
  HUMAN_LAYERS.forEach((layer) => {
    if (layers[layer] !== startTexture(layer)) params.set(layer, layers[layer]);
  });
  return params.toString();
};
