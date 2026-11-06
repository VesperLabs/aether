/** Image models the lab offers; the dev server refuses anything else. */
export const DRAW_MODELS = [
  { value: "gemini-3.1-flash-lite-image", label: "Nano Banana 2 Lite" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana" },
  { value: "gemini-3.1-flash-image", label: "Nano Banana 2" },
  { value: "gemini-nano-banana-2.1", label: "Nano Banana 2.1" },
  { value: "gemini-3-pro-image", label: "Nano Banana Pro" },
];

export const START_MODEL = "gemini-3.1-flash-image";

/** Saved as a draw's model when it started as a copy of the sheet's frame, with no Gemini call. */
export const HAND_DRAWN_MODEL = "hand-drawn";

/** Saved as a draw's model when it's a sheet's frame that a merge replaced. */
export const OVERWRITTEN_MODEL = "overwritten";
