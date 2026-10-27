import type { ServerWorld } from "../server-world";
import type { GameIo, GameSocket } from "@/network";

/** Things that belong to one connection and outlive a single command. */
export interface ConnectionSession {
  /** The peerjs id the client announced with `peerInit`, used for video chat. */
  peerId: string | null;
}

/** Everything a command handler needs to know about who sent the command and where. */
export interface CommandContext {
  world: ServerWorld;
  io: GameIo;
  socket: GameSocket;
  socketId: string;
  session: ConnectionSession;
}
