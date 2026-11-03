import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connectClient, type Socket } from "socket.io-client";
import { createManualClock, type ManualClock } from "@/rules/world";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";
import { createServerDice } from "../server-dice";

type Anything = any;

/** Every test server rolls the same dice, so a failing run fails the same way again. */
export const TEST_SEED = 1;
/** A real date, so code that treats a time of 0 as "never" still works. */
const START_TIME = Date.UTC(2026, 0, 1);

export interface TestServer {
  gameServer: GameServer;
  world: Anything;
  /** Game time only moves when a test moves it. */
  clock: ManualClock;
  url: string;
  connect(): Promise<Socket>;
  /** Connects and logs in a demo hero. `player` is the server's copy. */
  login(charClass?: string): Promise<{ socket: Socket; player: Anything; world: Anything }>;
  /** Fast-forwards the world by `ms` of game time, then waits for what it sent to arrive. */
  run(socket: Socket, ms: number): Promise<void>;
  /**
   * Runs `step`, fast-forwards `everyMs`, and repeats until `done`. Fails once `maxMs` of game
   * time has passed, which takes milliseconds of real time, not seconds.
   */
  until(
    socket: Socket,
    done: () => boolean,
    options?: { step?: () => void; everyMs?: number; maxMs?: number },
  ): Promise<void>;
  close(): void;
}

/** The game server on a random port, on a manual clock and seeded dice. */
export async function startTestServer(): Promise<TestServer> {
  process.env.PUBLIC_DIR = "public";
  const clock = createManualClock(START_TIME);
  const dice = createServerDice(TEST_SEED);
  const httpServer = http.createServer();
  const gameServer = new GameServer({ httpServer, db: await initFakeDatabase(dice), clock, dice });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  const sockets: Socket[] = [];

  const connect = async () => {
    const socket = connectClient(url, { transports: ["websocket"], forceNew: true });
    sockets.push(socket);
    await once(socket, "connect");
    return socket;
  };

  const server: TestServer = {
    gameServer,
    world: gameServer.world,
    clock,
    url,
    connect,
    async login(charClass = "warrior") {
      const socket = await connect();
      const heroInit = once(socket, "heroInit");
      socket.emit("demoLogin", { charClass });
      await heroInit;
      return { socket, world: gameServer.world, player: gameServer.world.players[socket.id!] };
    },
    async run(socket, ms) {
      await settle(socket);
      clock.advance(ms);
      await settle(socket);
    },
    async until(socket, done, { step, everyMs = 50, maxMs = 15000 } = {}) {
      for (let elapsed = 0; !done(); elapsed += everyMs) {
        if (elapsed > maxMs) throw new Error(`condition not reached in ${maxMs}ms of game time`);
        step?.();
        await server.run(socket, everyMs);
      }
    },
    close() {
      sockets.forEach((socket) => socket.disconnect());
      gameServer.close();
      httpServer.close();
    },
  };
  return server;
}

/** Resolves with the event's arguments, or fails after `timeoutMs` of real time. */
export function once<T = Anything>(socket: Socket, event: string, timeoutMs = 5000): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (...args: T[]) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

/**
 * Resolves once the server has handled everything this socket sent before it, and everything
 * the server sent back has arrived. Socket.io keeps one connection's messages in order.
 */
export const settle = (socket: Socket) =>
  new Promise<void>((resolve) => socket.emit("latency", () => resolve()));

/** Whether doing `act` makes the server send `event`, known without waiting out a timeout. */
export async function replies(socket: Socket, event: string, act: () => void): Promise<boolean> {
  let arrived = false;
  const listener = () => (arrived = true);
  socket.on(event, listener);
  act();
  await settle(socket);
  socket.off(event, listener);
  return arrived;
}
