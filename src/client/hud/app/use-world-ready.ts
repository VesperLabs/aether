import { useEffect, useState } from "react";

/** How long the login title takes to cross into the world, HUD included. */
export const WORLD_REVEAL_MS = 800;

/** True once the world has settled after login: see client/scenes/world-reveal.ts. */
export function useWorldReady(isLoggedIn: boolean) {
  const [isWorldReady, setIsWorldReady] = useState(false);

  useEffect(() => {
    const onWorldReady = () => setIsWorldReady(true);
    window.addEventListener("WORLD_READY", onWorldReady);
    return () => window.removeEventListener("WORLD_READY", onWorldReady);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) setIsWorldReady(false);
  }, [isLoggedIn]);

  return isWorldReady;
}
