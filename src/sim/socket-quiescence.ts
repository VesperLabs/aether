import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { GameIo } from "@/network/socket/game-socket";

interface Counts {
  /** Message packets the server wrote to this connection. */
  serverSent: number;
  /** Message packets the server read from it. */
  serverRead: number;
  /** Message packets the client wrote. */
  clientSent: number;
  /** Message packets the client read. */
  clientRead: number;
}

/** Real time `settle` waits for in-flight packets before giving up. */
const SETTLE_TIMEOUT_MS = 5000;

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Knows when every packet between the server and the sim's own clients has landed, by counting
 * engine.io message packets on both ends of each connection. Settling on that, rather than on a
 * fixed number of event loop turns, keeps manual-clock runs the same on a slow CI machine.
 */
export function createSocketQuiescence(io: GameIo) {
  const byEngineId = new Map<string, Counts>();
  const countsFor = (id: string) => {
    let counts = byEngineId.get(id);
    if (!counts) {
      counts = { serverSent: 0, serverRead: 0, clientSent: 0, clientRead: 0 };
      byEngineId.set(id, counts);
    }
    return counts;
  };
  /** Engine ids of connections the sim opened; others (e.g. a bot runner's) are not counted. */
  const tracked = new Set<string>();

  io.engine.on(
    "connection",
    (raw: { id: string; on: (e: string, f: (p: { type: string }) => void) => void }) => {
      raw.on("packetCreate", (p) => p.type === "message" && countsFor(raw.id).serverSent++);
      raw.on("packet", (p) => p.type === "message" && countsFor(raw.id).serverRead++);
    },
  );

  const isQuiet = () => {
    for (const id of tracked) {
      const c = countsFor(id);
      if (c.serverSent !== c.clientRead || c.clientSent !== c.serverRead) return false;
    }
    return true;
  };

  return {
    /** Starts counting a client right after it is created, before its first packet. */
    track(socket: ClientGameSocket) {
      const engine = socket.io.engine;
      /* The session id arrives with the handshake; `engine.id` is only set after this event. */
      engine.on("handshake", ({ sid: id }: { sid: string }) => {
        tracked.add(id);
        const counts = countsFor(id);
        engine.on("packetCreate", (p) => p.type === "message" && counts.clientSent++);
        engine.on("packet", (p) => p.type === "message" && counts.clientRead++);
        engine.on("close", () => tracked.delete(id));
      });
    },
    /** Resolves once nothing is in flight and handlers have stopped sending, two turns running. */
    async settle() {
      const giveUpAt = performance.now() + SETTLE_TIMEOUT_MS;
      let quietTurns = 0;
      while (quietTurns < 2) {
        await nextTurn();
        quietTurns = isQuiet() ? quietTurns + 1 : 0;
        if (performance.now() > giveUpAt) {
          throw new Error(`Sockets still had packets in flight after ${SETTLE_TIMEOUT_MS}ms`);
        }
      }
    },
  };
}
