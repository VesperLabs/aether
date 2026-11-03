import { useSyncExternalStore } from "react";
import type { ClientState } from "@/network/session/client-state";
import type { ClientStore } from "@/network/session/client-store";

/** Reads part of the client state and re-renders when it changes. `select` must return stable values. */
export function useClientState<T>(store: ClientStore, select: (state: ClientState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.state));
}
