import type { GameEvents } from "../events";

/** A small typed event emitter. No dependencies, so it runs in the browser as well as on the server. */

export type EventHandler<Payload> = (payload: Payload) => void;

export interface EventBus<Events extends object> {
  /** Subscribe. Returns a function that unsubscribes. */
  on<Name extends keyof Events>(name: Name, handler: EventHandler<Events[Name]>): () => void;
  off<Name extends keyof Events>(name: Name, handler: EventHandler<Events[Name]>): void;
  /** Call every handler for `name` in subscription order. */
  emit<Name extends keyof Events>(name: Name, payload: Events[Name]): void;
}

export function createEventBus<Events extends object>(): EventBus<Events> {
  const handlers = new Map<keyof Events, Set<EventHandler<never>>>();

  const off: EventBus<Events>["off"] = (name, handler) => {
    handlers.get(name)?.delete(handler as EventHandler<never>);
  };

  const on: EventBus<Events>["on"] = (name, handler) => {
    let set = handlers.get(name);
    if (!set) {
      set = new Set();
      handlers.set(name, set);
    }
    set.add(handler as EventHandler<never>);
    return () => off(name, handler);
  };

  const emit: EventBus<Events>["emit"] = (name, payload) => {
    const set = handlers.get(name);
    if (!set) return;
    // Copy so handlers can unsubscribe (or subscribe) while an event is being delivered.
    for (const handler of [...set]) {
      if (set.has(handler)) (handler as EventHandler<typeof payload>)(payload);
    }
  };

  return { on, off, emit };
}

/** The bus every game event goes through. */
export type GameEventBus = EventBus<GameEvents>;

export const createGameEventBus = (): GameEventBus => createEventBus<GameEvents>();
