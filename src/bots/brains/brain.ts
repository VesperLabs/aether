import type { ClientState, ClientCharacter } from "@/network/session/client-state";
import type { Rng } from "@/rules/world/rng";

/** What a bot wants to do this step. The bot turns it into real commands. */
export interface BotIntent {
  /** Walk intent, each axis -1..1, like keys or a joystick. */
  move: { x: number; y: number };
  /** Swing the weapon toward `angle` (radians). */
  attack?: { angle: number };
  /** Say something in chat. */
  chat?: string;
}

/** What a brain sees: the client state, the hero in it, and the brain's own last intent. */
export interface BotView {
  clientState: ClientState;
  self: ClientCharacter;
  last: BotIntent;
}

/** A pure decision: same view, tick and rng state give the same intent. */
export type Brain = (view: BotView, tick: number, rng: Rng) => BotIntent;

export const STAND_STILL: BotIntent = { move: { x: 0, y: 0 } };
