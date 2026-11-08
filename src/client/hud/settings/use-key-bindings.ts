import { useSyncExternalStore } from "react";
import {
  getBindings,
  keyFor,
  subscribeBindings,
  type BindAction,
} from "@/client/input/key-bindings";

/** Every binding, re-rendering when any changes. */
export const useBindings = () => useSyncExternalStore(subscribeBindings, getBindings);

/** The key bound to an action, re-rendering when it's rebound. Undefined when unbound. */
export const useKeyFor = (action: BindAction) => {
  useBindings();
  return keyFor(action);
};
