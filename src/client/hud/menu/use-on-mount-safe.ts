import type { EffectCallback } from "react";
import { useEffect, useEffectEvent, useRef } from "react";

export function useOnMountUnsafe(effect: EffectCallback) {
  const initialized = useRef(false);
  const onMount = useEffectEvent(effect);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      onMount();
    }
  }, []);
}
