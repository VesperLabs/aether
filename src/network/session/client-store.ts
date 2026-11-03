import type { ChatMessage, ServerToClientEvents } from "@/network/messages";
import { addChat, applyMessage, createClientState, type ClientState } from "./client-state";

/** A listener told after the client state changed. */
type Listener = () => void;

/**
 * A client state plus change notification, so views outside the game loop (the React HUD) can
 * subscribe to it. Feed it every server message with `apply`.
 */
export interface ClientStore {
  readonly state: ClientState;
  /** Applies one server message, then tells every listener. */
  apply(name: keyof ServerToClientEvents, ...args: unknown[]): void;
  /** Adds a client-only chat entry (level up, loot found, errors), then tells every listener. */
  addLocalChat(message: ChatMessage): void;
  /** Forgets everything (on disconnect): chat, party, characters. Then tells every listener. */
  reset(): void;
  /** Calls `listener` after each change. Returns the function that stops it. */
  subscribe(listener: Listener): () => void;
}

/** `clock` stamps chat entries with the time they arrived, for fading old ones. */
export function createClientStore(clock: () => number): ClientStore {
  const state = createClientState();
  const listeners = new Set<Listener>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const stamp = (message: ChatMessage) => ({ ...message, timestamp: clock() });
  return {
    state,
    apply(name, ...args) {
      if (name === "message" && args[0]) args = [stamp(args[0] as ChatMessage)];
      (applyMessage as (s: ClientState, n: string, ...a: unknown[]) => void)(state, name, ...args);
      notify();
    },
    addLocalChat(message) {
      addChat(state, stamp(message));
      notify();
    },
    reset() {
      Object.assign(state, createClientState(), { revision: state.revision + 1 });
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
