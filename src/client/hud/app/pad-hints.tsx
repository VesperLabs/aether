import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { PadHintProvider, PadStyleProvider } from "@/ui";
import { getLastDevice, getPadStyle, subscribeLastDevice } from "@/client/input/last-device";
import type { BindAction } from "@/client/input/key-bindings";
import { MODAL_KEYS } from "@/client/input/gamepad";
import { useBindings } from "@/client/hud/settings/use-key-bindings";

/**
 * While a controller is in use, key badges inside draw the controller button for their key,
 * labelled the way that controller's family labels it.
 */
export const PadHints = ({ children }: { children: ReactNode }) => {
  const device = useSyncExternalStore(subscribeLastDevice, getLastDevice);
  const style = useSyncExternalStore(subscribeLastDevice, getPadStyle);
  const bindings = useBindings();
  const hint = useCallback(
    (key: string, inModal: boolean) => {
      if (inModal && key in MODAL_KEYS) return { button: MODAL_KEYS[key] };
      const action = (Object.keys(bindings.keyboard) as BindAction[]).find((id) =>
        bindings.keyboard[id].includes(key),
      );
      return (action && bindings.gamepad[action]) || undefined;
    },
    [bindings],
  );
  return (
    <PadStyleProvider value={style}>
      <PadHintProvider value={device === "gamepad" ? hint : undefined}>{children}</PadHintProvider>
    </PadStyleProvider>
  );
};
