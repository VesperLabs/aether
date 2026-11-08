import type { BotPersonality, BotStrategyId } from "@/content";
import type { Point, Rng } from "@/rules/world";

/*
 * A bot thinks in four layers, each at its own pace:
 *
 *   strategy  what it is working toward ("level up")       every few seconds
 *   plan      the steps that get it there ("hunt")          when a step ends
 *   task      how it does the current step ("fight X")      a few times a second
 *   reflex    what it does right now ("drink a potion")     every think
 *
 * Tasks and reflexes return intents. Each intent goes on a channel (a body part): the highest
 * priority wins within a channel, and different channels happen together.
 */

/** What a bot can see. Read-only, rebuilt for every think. */
export interface BotView {
  /** Game time, ms. */
  now: number;
  self: {
    id: string;
    roomName: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    isDead: boolean;
    /** Where it spawned: what it wanders around. */
    home: Point;
    /** How its last `walkTo` is going, or null when it is not walking anywhere. */
    walk: BotWalkView | null;
  };
}

/** A walk the server is carrying out. `blocked` means no path, or it stopped making progress. */
interface BotWalkView {
  to: Point;
  status: "walking" | "arrived" | "blocked";
}

/** Body parts: what a bot can do at the same time. */
export type BotChannel = "move" | "action";

/** Something a bot wants done. The server turns it into the same commands a client sends. */
export type BotIntent =
  | { channel: "move"; type: "stop" }
  | { channel: "move"; type: "walkTo"; to: Point }
  | { channel: "action"; type: "respawn" };

/** An intent and how much it matters against others on its channel. */
export interface WeightedIntent {
  priority: number;
  intent: BotIntent;
}

/** The parameters of each task. A new task adds its entry here. */
interface BotTaskParams {
  idle: Record<string, never>;
  walkTo: { to: Point };
  pause: { ms: number };
}
export type BotTaskId = keyof BotTaskParams;

/** One step of a plan: a task and what it was given. */
export type BotStep = { [K in BotTaskId]: { task: K; params: BotTaskParams[K] } }[BotTaskId];

/** The plan being followed, and how far along it is. */
interface BotPlanState {
  id: string;
  steps: BotStep[];
  step: number;
}

/** Everything a bot remembers between thinks. Plain data, so it can be logged and tested. */
export interface BotMemory {
  strategy: BotStrategyId | null;
  plan: BotPlanState | null;
  /** When the current plan step began, so a task can tell how long it has been at it. */
  stepStartedAt: number;
  /** When it last saw itself die, to wait a moment before respawning. */
  diedAt: number | null;
  /** When each slow layer thinks next. */
  nextStrategyAt: number;
  nextTaskAt: number;
}

/** What each layer is handed. */
export interface BotMind {
  view: BotView;
  memory: BotMemory;
  personality: BotPersonality;
  rng: Rng;
}

/** A long-term aim. Scores how much it wants to be pursued now and plans the steps. */
export interface BotStrategy {
  score: (mind: BotMind) => number;
  plan: (mind: BotMind) => BotPlanState;
}

type BotTaskStatus = "running" | "done" | "failed";

/** Does one step. Runs a few times a second until it is done or fails. */
export interface BotTask<K extends BotTaskId> {
  run: (mind: BotMind, params: BotTaskParams[K]) => { status: BotTaskStatus; intents: BotIntent[] };
}

/** A quick reaction that runs on every think, whatever the plan. */
export type BotReflex = (mind: BotMind) => WeightedIntent[];
