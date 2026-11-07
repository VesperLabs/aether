import { HUMAN_PROMPT, QUARTER_TURN_PROMPT } from "./draw-prompts";

/** Each tab beside the Core prompt box. Add one here, and its icon in `prompt-fields.tsx`. */
export const CORE_PROMPTS = [
  { id: "human", label: "Human body", prompt: HUMAN_PROMPT },
  { id: "quarterTurn", label: "Quarter turn", prompt: QUARTER_TURN_PROMPT },
] as const;

export type CorePromptId = (typeof CORE_PROMPTS)[number]["id"];

export const START_CORE_PROMPT: CorePromptId = "human";

export const getCorePrompt = (id: CorePromptId) =>
  CORE_PROMPTS.find((option) => option.id === id) ?? CORE_PROMPTS[0];
