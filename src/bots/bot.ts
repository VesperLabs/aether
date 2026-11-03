import type { ClientGameSocket } from "@/network/socket/game-socket";
import { createHeroDrive, driveHero } from "@/network/session/hero-driver";
import {
  applyMessage,
  createClientState,
  getSelf,
  type ClientState,
} from "@/network/session/client-state";
import { readTileMap, type TiledMapJson, type TileMap } from "@/rules/movement/tilemap";
import type { Clock } from "@/rules/world/clock";
import type { Rng } from "@/rules/world/rng";
import { STAND_STILL, type Brain, type BotIntent } from "./brains/brain";

/*
 * A headless player. It sees the world only through server messages (its client state) and acts only by
 * sending the same commands the browser client sends, so the server treats it like anyone else.
 */

/** Fewest ms between attack commands; the server refuses swings that are not ready anyway. */
const ATTACK_EVERY_MS = 250;
const DEFAULT_WALK_SPEED = 100;

export interface BotOptions {
  socket: ClientGameSocket;
  clock: Clock;
  /** The Tiled JSON of a room's map, by room name; undefined if unknown (the bot then stands still). */
  loadMap: (roomName: string) => TiledMapJson | undefined;
  brain: Brain;
  rng: Rng;
}

export interface Bot {
  clientState: ClientState;
  /** Times the server rejected a move with `positionCorrection`. */
  corrections: number;
  /** Steps since the bot was created. */
  steps: number;
  /** Thinks and acts once, moving the hero `seconds` of walking. */
  step(seconds: number): void;
  /** Steps every `ms` on the bot's clock until the returned function is called. */
  run(ms: number): () => void;
}

const facing = (vx: number, vy: number, fallback: string) => {
  if (!vx && !vy) return fallback;
  if (Math.abs(vx) >= Math.abs(vy)) return vx < 0 ? "left" : "right";
  return vy < 0 ? "up" : "down";
};

const walkSpeedOf = (stats: unknown) => {
  const speed = (stats as { walkSpeed?: unknown } | undefined)?.walkSpeed;
  return typeof speed === "number" ? speed : DEFAULT_WALK_SPEED;
};

export function createBot({ socket, clock, loadMap, brain, rng }: BotOptions): Bot {
  const clientState = createClientState();
  const maps = new Map<string, TileMap | undefined>();
  let drive = createHeroDrive();
  /* The bot's own idea of where it stands: the server's poses of the hero lag behind it. */
  let hero: { x: number; y: number; roomName: string } | undefined;
  let last: BotIntent = STAND_STILL;
  let lastAttackAt = -Infinity;

  const resync = () => {
    const self = getSelf(clientState);
    hero = self ? { x: self.x, y: self.y, roomName: clientState.roomName } : undefined;
    drive = createHeroDrive();
  };

  const mapOf = (roomName: string) => {
    if (!maps.has(roomName)) {
      const json = loadMap(roomName);
      maps.set(roomName, json ? readTileMap(json) : undefined);
    }
    return maps.get(roomName);
  };

  const bot: Bot = {
    clientState,
    corrections: 0,
    steps: 0,
    step(seconds) {
      bot.steps++;
      const self = getSelf(clientState);
      if (!self || !hero || hero.roomName !== clientState.roomName) resync();
      if (!self || !hero) return;
      const map = mapOf(hero.roomName);
      if (!map || self.state?.isDead) return;
      /* Brains see the hero where the bot has it, not at its lagging pose. */
      Object.assign(self, { x: hero.x, y: hero.y });

      const intent = brain({ clientState, self, last }, bot.steps, rng);
      last = intent;

      const direction = facing(intent.move.x, intent.move.y, self.direction ?? "down");
      const result = driveHero(drive, {
        hero: {
          id: self.id,
          x: hero.x,
          y: hero.y,
          bodySize: self.bodySize,
          roomName: hero.roomName,
          walkSpeed: walkSpeedOf(self.stats),
        },
        map,
        players: clientState.players.values(),
        stick: intent.move,
        isRooted: !!self.state?.isAttacking,
        direction,
        seconds,
        now: clock.now(),
      });
      hero.x = result.x;
      hero.y = result.y;
      Object.assign(self, { x: hero.x, y: hero.y, vx: result.vx, vy: result.vy, direction });
      if (result.input) socket.emit("playerInput", result.input);

      const now = clock.now();
      if (intent.attack && now - lastAttackAt >= ATTACK_EVERY_MS) {
        lastAttackAt = now;
        socket.emit("attack", { count: 1, direction, castAngle: intent.attack.angle });
      }
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

  socket.onAny((name: string, ...args: unknown[]) => {
    (applyMessage as (m: ClientState, name: string, ...rest: unknown[]) => void)(
      clientState,
      name,
      ...args,
    );
    if (name === "positionCorrection") {
      bot.corrections++;
      resync();
    } else if (name === "heroInit") {
      resync();
    }
  });

  return bot;
}
