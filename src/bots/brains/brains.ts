import type { Brain } from "./brain";
import { grind } from "./grind";
import { idle } from "./idle";
import { wander } from "./wander";

/** Every brain a bot can run, by the name the CLI takes. */
export const BRAINS = { idle, wander, grind } satisfies Record<string, Brain>;

export type BrainName = keyof typeof BRAINS;

export const isBrainName = (name: string): name is BrainName => name in BRAINS;
