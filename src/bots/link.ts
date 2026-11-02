import type { ClientToServerEvents, CommandName, ServerToClientEvents } from "@/network";

export type MessageName = keyof ServerToClientEvents;
export type MessagePayload<M extends MessageName> = Parameters<ServerToClientEvents[M]>[0];

/**
 * How a bot reaches the game server: commands out, messages in, the same ones a browser uses.
 * Hosts provide one (a socket.io client, or the simulation's in-process hub).
 */
export interface BotLink {
  /** The id the server knows this connection by (the player's socket id). */
  readonly id: string;
  send<C extends CommandName>(command: C, ...args: Parameters<ClientToServerEvents[C]>): void;
  /** Listens for a message; returns a function that stops listening. */
  on<M extends MessageName>(message: M, listener: (payload: MessagePayload<M>) => void): () => void;
  close(): void;
}

/** Time for a bot, passed in so tests and hosts control it (bots never read the clock). */
export interface Clock {
  /** Milliseconds, only ever compared with each other. */
  now(): number;
  sleep(ms: number): Promise<void>;
}
