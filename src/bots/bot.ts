import type { ClientGameSocket } from "@/network/socket/game-socket";
import {
  createPlayerInputThrottle,
  getHeroStep,
  nextPlayerInput,
} from "@/network/session/hero-control";
import { stepHeroPosition } from "@/network/session/hero-motion";
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

/** Bodies this close drift the hero apart, as in the client. */
const CROWD_RANGE = 24;
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
  const throttle = createPlayerInputThrottle();
  /* The bot's own idea of where it stands: the server's poses of the hero lag behind it. */
  let hero: { x: number; y: number; roomName: string } | undefined;
  let velocity = { x: 0, y: 0 };
  let crowdPush = { x: 0, y: 0 };
  let last: BotIntent = STAND_STILL;
  let lastAttackAt = -Infinity;

  const resync = () => {
    const self = getSelf(clientState);
    hero = self ? { x: self.x, y: self.y, roomName: clientState.roomName } : undefined;
    velocity = { x: 0, y: 0 };
    crowdPush = { x: 0, y: 0 };
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

      const neighbours = [];
      for (const list of [clientState.npcs, clientState.players]) {
        for (const c of list.values()) {
          if (c === self || c.state?.isDead) continue;
          if (Math.abs(c.x - hero.x) > CROWD_RANGE || Math.abs(c.y - hero.y) > CROWD_RANGE)
            continue;
          neighbours.push({ id: c.id, x: c.x, y: c.y });
        }
      }
      const walkSpeed = walkSpeedOf(self.stats);
      const {
        vx,
        vy,
        crowdPush: push,
      } = getHeroStep({
        keys: { x: 0, y: 0 },
        stick: intent.move,
        walkSpeed,
        isRooted: !!self.state?.isAttacking,
        current: velocity,
        lastCrowdPush: crowdPush,
        seconds,
        self: { id: self.id, x: hero.x, y: hero.y },
        neighbours,
      });
      crowdPush = push;
      const moved = stepHeroPosition(
        map.grid,
        { width: map.widthInPixels, height: map.heightInPixels },
        { x: hero.x, y: hero.y, vx, vy, bodySize: self.bodySize },
        seconds,
      );
      velocity = { x: moved.blockedX ? 0 : vx, y: moved.blockedY ? 0 : vy };
      hero.x = moved.x;
      hero.y = moved.y;
      const direction = facing(velocity.x, velocity.y, self.direction ?? "down");
      Object.assign(self, { x: hero.x, y: hero.y, vx: velocity.x, vy: velocity.y, direction });

      const lastSent = throttle.lastEmitted;
      const payload = nextPlayerInput(
        throttle,
        {
          ...hero,
          isIdle: !velocity.x && !velocity.y && !!lastSent && !lastSent.vx && !lastSent.vy,
        },
        velocity.x,
        velocity.y,
        direction,
        clock.now(),
      );
      if (payload) socket.emit("playerInput", payload);

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
