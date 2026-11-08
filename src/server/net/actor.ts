import type { GameSocket } from "@/network";

/**
 * Whoever issued a command: a person's socket today, a server-run bot later. Command handlers talk
 * to the actor instead of a socket, so the same handler serves both.
 */
export interface Actor {
  /** Sends to this actor only. */
  emit: GameSocket["emit"];
  /** Sends to everyone in a room except this actor. */
  toOthers: (room: string) => ReturnType<GameSocket["to"]>;
  /** Starts receiving what is broadcast to these socket rooms. */
  join: (rooms: string | string[]) => void;
  /** Stops receiving what is broadcast to this socket room. */
  leave: (room: string) => void;
}

/** The actor for a connected person. */
export function socketActor(socket: GameSocket): Actor {
  return {
    emit: socket.emit.bind(socket),
    toOthers: (room) => socket.to(room),
    join: (rooms) => void socket.join(rooms),
    leave: (room) => void socket.leave(room),
  };
}
