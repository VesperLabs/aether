import type { ServerWorld } from "../server-world";
import type { GameIo, GameSocket } from "@/network";

/** Things that belong to one connection and outlive a single command. */
interface ConnectionSession {
  /** The peerjs id the client announced with `peerInit`, used for video chat. */
  peerId: string | null;
  /** The room this connection watches without a character, if any. */
  observedRoom?: string;
  /** When it last asked to observe a room. */
  lastObservedAt?: number;
}

/** Everything a command handler needs to know about who sent the command and where. */
export interface CommandContext {
  world: ServerWorld;
  io: GameIo;
  socket: GameSocket;
  socketId: string;
  session: ConnectionSession;
}
