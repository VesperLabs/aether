import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { ClientState } from "@/network/session/client-state";
import { createHeroSession, type HeroSession } from "@/network/session/hero/hero-session";
import { PING_INTERVAL_MS } from "@/network/session/hero/latency";
import { createRoomMaps, type RoomMapJson } from "@/network/session/hero/room-maps";
import { getSpinDirection } from "@/network/session/hero/spin-direction";
import type { Clock } from "@/rules/world/clock";
import type { Rng } from "@/rules/world/rng";
import { STAND_STILL, type Brain, type BotIntent } from "./brains/brain";

/*
 * A headless player: a hero session plus a brain. It sees the world only through server messages
 * and acts only through the session, which sends the same commands the browser client sends.
 */

/** How long a dead bot lies there before it respawns, ms. */
export const RESPAWN_DELAY_MS = 3000;

export interface BotOptions {
  socket: ClientGameSocket;
  clock: Clock;
  /** The Tiled JSON of a room's map, by room name; undefined if unknown (the bot then stands still). */
  loadMap: (roomName: string) => RoomMapJson | undefined;
  brain: Brain;
  rng: Rng;
}

export interface Bot {
  session: HeroSession;
  clientState: ClientState;
  /** Times the server rejected a move with `positionCorrection`. */
  readonly corrections: number;
  /** Steps since the bot was created. */
  steps: number;
  /** Thinks and acts once, moving the hero `seconds` of walking. */
  step(seconds: number): void;
  /** Steps every `ms` on the bot's clock until the returned function is called. */
  run(ms: number): () => void;
}

const ORIGIN = { x: 0, y: 0 };

export function createBot({ socket, clock, loadMap, brain, rng }: BotOptions): Bot {
  const session = createHeroSession({ send: socket.emit.bind(socket), now: () => clock.now() });
  const mapOf = createRoomMaps(loadMap);
  let last: BotIntent = STAND_STILL;
  let lastPing = -Infinity;

  const bot: Bot = {
    session,
    clientState: session.clientState,
    get corrections() {
      return session.corrections;
    },
    steps: 0,
    step(seconds) {
      bot.steps++;
      const now = clock.now();
      if (now - lastPing >= PING_INTERVAL_MS) {
        lastPing = now;
        session.ping();
      }
      const self = session.self();
      if (!self) return;
      const deadFor = session.deadFor();
      if (deadFor !== undefined) {
        if (deadFor >= RESPAWN_DELAY_MS) session.respawn();
        return;
      }

      const intent = brain({ clientState: session.clientState, self, last }, bot.steps, rng);
      last = intent;
      const isMoving = intent.move.x || intent.move.y;
      const view = session.frame(
        {
          stick: intent.move,
          direction: isMoving ? getSpinDirection(ORIGIN, intent.move) : undefined,
          angle: intent.attack?.angle,
          isHoldingAttack: !!intent.attack,
        },
        {
          seconds,
          map: mapOf(session.clientState.roomName),
          crowd: {
            npcs: session.clientState.npcs.values(),
            players: session.clientState.players.values(),
          },
        },
      );
      if (view) Object.assign(self, { vx: view.vx, vy: view.vy });
      if (intent.chat) socket.emit("message", { message: intent.chat });
    },
    run(ms) {
      let cancel = () => {};
      let stopped = false;
      const loop = () => {
        if (stopped) return;
        bot.step(ms / 1000);
        cancel = clock.setTimer(loop, ms);
      };
      cancel = clock.setTimer(loop, ms);
      return () => {
        stopped = true;
        cancel();
      };
    },
  };

  socket.onAny((name: string, ...args: unknown[]) => session.receive(name, ...args));
  return bot;
}
