import { io as connectSocket } from "socket.io-client";
import type { ServerToClientEvents } from "@/network/messages";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import { createApp } from "@/server/app/create-app";
import { readConfig } from "@/server/config/config";
import { createMemoryLogger, type MemoryLogger } from "@/server/log/logger";
import { initFakeDatabase } from "@/server/persistence/fake";
import { createServerDice } from "@/server/world/server-dice";
import type { ServerWorld } from "@/server/world/server-world";
import { teleportPlayer } from "@/server/players/teleport";
import { createSimClock, type SimClock, type SimClockMode } from "./sim-clock";
import { createSocketQuiescence } from "./socket-quiescence";

/** A real game server running in-process on a free port, with a fake database and a virtual clock. */
export interface SimServer {
  url: string;
  port: number;
  world: ServerWorld;
  clock: SimClock;
  log: MemoryLogger;
  /** Runs `n` world ticks. Throws if the loop is paused (it pauses while nobody is logged in). */
  ticks(n: number): Promise<void>;
  /** Opens a new client connection and waits until it is connected. */
  connect(): Promise<ClientGameSocket>;
  /**
   * Moves a logged-in player the way doors and travel cheats do, and resolves once their client
   * has resynced from `heroInit`. `room` defaults to the room they are in.
   */
  teleport(socket: ClientGameSocket, to: { x: number; y: number; room?: string }): Promise<void>;
  /** Disconnects every client and shuts the server down. */
  close(): Promise<void>;
}

export async function createSimServer({
  seed = 1,
  mode = "manual",
  config: overrides = {},
}: {
  seed?: number;
  mode?: SimClockMode;
  /** Extra environment variables, as `readConfig` reads them. */
  config?: Record<string, string | undefined>;
} = {}): Promise<SimServer> {
  const config = readConfig({ PORT: "0", NODE_ENV: "test", ...overrides });
  /* The clock settles on the sockets, which exist only once the app does. */
  let settleIo: () => Promise<void> = async () => {};
  const clock = createSimClock({ fps: config.fps, mode, settle: () => settleIo() });
  const log = createMemoryLogger();
  const db = await initFakeDatabase(log, createServerDice(seed));
  const app = await createApp(config, { db, clock, seed, logger: log });
  const url = `http://localhost:${app.port}`;
  const world = app.server.world;
  const quiescence = createSocketQuiescence(world.io);
  settleIo = quiescence.settle;
  const clients: ClientGameSocket[] = [];

  return {
    url,
    port: app.port,
    world,
    clock,
    log,
    async ticks(n) {
      if (!world.loop.isRunning()) {
        throw new Error("The world loop is paused: log a player in before stepping ticks");
      }
      await clock.ticks(n);
    },
    async teleport(socket, { x, y, room }) {
      const player = world.players[socket.id!];
      const dest = room ?? player?.roomName;
      if (!dest) throw new Error("Only a logged-in player in a room can be teleported");
      const resynced = nextMessage(socket, "heroInit");
      teleportPlayer(world, socket.id!, dest, { x, y });
      await resynced;
    },
    async connect() {
      const socket: ClientGameSocket = connectSocket(url, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
      });
      quiescence.track(socket);
      clients.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", () => resolve());
        socket.once("connect_error", reject);
      });
      return socket;
    },
    async close() {
      for (const socket of clients) socket.disconnect();
      clock.dispose();
      await app.close();
    },
  };
}

type MessageName = keyof ServerToClientEvents;
type MessageArgs<K extends MessageName> = Parameters<ServerToClientEvents[K]>;

/**
 * Resolves with the next `event` the client receives (its arguments), or rejects after
 * `timeoutMs` of real time. Listen before sending the command that triggers it.
 */
export function nextMessage<K extends MessageName>(
  socket: ClientGameSocket,
  event: K,
  { timeoutMs = 2000 }: { timeoutMs?: number } = {},
): Promise<MessageArgs<K>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener as never);
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for "${String(event)}"`));
    }, timeoutMs);
    const listener = (...args: MessageArgs<K>) => {
      clearTimeout(timer);
      resolve(args);
    };
    socket.once(event, listener as never);
  });
}
