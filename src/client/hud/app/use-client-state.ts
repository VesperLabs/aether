import { useRef, useSyncExternalStore } from "react";
import type { ClientState } from "@/network/session/client-state";
import type { ClientStore } from "@/network/session/client-store";

/** Reads part of the client state and re-renders when it changes. `select` must return stable values. */
export function useClientState<T>(store: ClientStore, select: (state: ClientState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.state));
}

/**
 * Derives a value from the client state, recomputed only when its revision changes (any message but
 * poses), so `derive` may build new objects. `derive` must read only the state.
 */
export function useClientDerived<T>(store: ClientStore, derive: (state: ClientState) => T): T {
  const cache = useRef<{ revision: number; value: T } | null>(null);
  return useSyncExternalStore(store.subscribe, () => {
    const { revision } = store.state;
    if (cache.current?.revision !== revision) {
      cache.current = { revision, value: derive(store.state) };
    }
    return cache.current.value;
  });
}
