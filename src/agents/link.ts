import type { ClientToServerEvents, CommandName, ServerToClientEvents } from "@/network";

export type MessageName = keyof ServerToClientEvents;
export type MessagePayload<M extends MessageName> = Parameters<ServerToClientEvents[M]>[0];

/**
 * How an agent reaches the game server: commands out, messages in, the same ones a browser uses.
 * Hosts provide one (a socket.io client today; an in-process or Cloudflare one later).
 */
export interface AgentLink {
  /** The id the server knows this connection by (the player's socket id). */
  readonly id: string;
  send<C extends CommandName>(command: C, ...args: Parameters<ClientToServerEvents[C]>): void;
  /** Listens for a message; returns a function that stops listening. */
  on<M extends MessageName>(message: M, listener: (payload: MessagePayload<M>) => void): () => void;
  close(): void;
}

/** Time for an agent, passed in so tests and hosts control it (agents never read the clock). */
export interface Clock {
  /** Milliseconds, only ever compared with each other. */
  now(): number;
  sleep(ms: number): Promise<void>;
}
