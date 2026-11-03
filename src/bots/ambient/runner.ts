import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { TiledMapJson } from "@/rules/movement/tilemap";
import type { Clock } from "@/rules/world/clock";
import { createRng } from "@/rules/world/rng";
import { createBot, type Bot } from "../bot";
import { grind } from "../brains/grind";
import { wander } from "../brains/wander";
import { decideBots, nextPollDelay, type AmbientPolicy, type AmbientState } from "./decide";

/*
 * Keeps a few bots in the world while humans play, so it doesn't feel empty, and takes them out
 * a while after the last human leaves, so they never keep an idle server busy.
 */

/** Bots think 10 times a second, a human's pace rather than the 20fps a load test uses. */
const STEP_MS = 100;
const MAX_POLL_MS = 60_000;

export interface AmbientOptions extends AmbientPolicy {
  clock: Clock;
  pollMs: number;
  seed: number;
  /** Humans online now, or undefined if the server can't be reached. */
  fetchHumans: () => Promise<number | undefined>;
  /** Opens a logged-in socket for bot `n` (1-based); it should log in again on reconnect. */
  connect: (n: number) => ClientGameSocket;
  loadMap: (roomName: string) => TiledMapJson | undefined;
  log: (message: string) => void;
}

export interface AmbientRunner {
  /** The bots online now. */
  bots: Bot[];
  /** Asks the server once and brings bots in or out. The poll loop calls it. */
  poll(): Promise<void>;
  /** Starts polling on the clock. */
  start(): void;
  /** Stops polling and disconnects every bot. */
  stop(): void;
}

/** Most bots wander; every third one grinds mobs. */
const brainOf = (n: number) => (n % 3 === 0 ? grind : wander);

export function createAmbientRunner(options: AmbientOptions): AmbientRunner {
  const { clock, pollMs, seed, fetchHumans, connect, loadMap, log } = options;
  let state: AmbientState = {};
  let failures = 0;
  let stopped = false;
  let cancelPoll = () => {};
  const online: { bot: Bot; socket: ClientGameSocket; stop: () => void }[] = [];

  const join = (count: number) => {
    log(`bringing ${count} bots in`);
    for (let n = online.length + 1; n <= count; n++) {
      const socket = connect(n);
      const bot = createBot({
        socket,
        clock,
        loadMap,
        brain: brainOf(n),
        rng: createRng(seed + n),
      });
      online.push({ bot, socket, stop: bot.run(STEP_MS) });
    }
  };

  const leave = () => {
    if (!online.length) return;
    log(`taking ${online.length} bots out`);
    for (const { socket, stop } of online.splice(0)) {
      stop();
      socket.disconnect();
    }
  };

  const runner: AmbientRunner = {
    get bots() {
      return online.map((o) => o.bot);
    },
    async poll() {
      const humans = await fetchHumans();
      if (stopped) return;
      failures = humans === undefined ? failures + 1 : 0;
      const next = decideBots(state, humans, clock.now(), options);
      state = next.state;
      if (next.desired > online.length) join(next.desired);
      else if (next.desired === 0) leave();
    },
    start() {
      const loop = async () => {
        await runner.poll();
        if (!stopped)
          cancelPoll = clock.setTimer(loop, nextPollDelay(failures, pollMs, MAX_POLL_MS));
      };
      void loop();
    },
    stop() {
      stopped = true;
      cancelPoll();
      leave();
    },
  };
  return runner;
}
