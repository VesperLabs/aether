import { useEffect, useState } from "react";
import type { BuiltItem } from "@/content";
import { Box } from "@/ui/kit";

/** The whole burst, in ms: like the catch flash, but slower so it reads at slot size. */
const BURST_MS = 900;

/** The gear a card was just confirmed into: the one item due a burst. */
let awaitingMod: string | undefined;

/** Marks `gearId` to burst the next time a mod fills one of its slots, and only then. */
export function expectModBurst(gearId: string | undefined) {
  awaitingMod = gearId;
}

/**
 * A count that goes up when a card the player just confirmed lands in this item. Keyed on it, the
 * burst plays once for that socketing and never when the item is moved or redrawn.
 */
export function useModBurst(item: BuiltItem | null | undefined): number {
  const id = item?.id;
  const filled = item?.mods?.filter(Boolean).length ?? 0;
  const [seen, setSeen] = useState({ id, filled, bursts: 0 });
  /* Adjusting state from the last render's, as React recommends over an effect */
  if (seen.id !== id || seen.filled !== filled) {
    const modded = !!id && id === awaitingMod && seen.id === id && filled > seen.filled;
    /* A different item (or none) resets it, so an item that comes back doesn't replay its burst */
    const bursts = modded ? seen.bursts + 1 : seen.id === id ? seen.bursts : 0;
    setSeen({ id, filled, bursts });
  }
  /* Spent once it has played, so the item never bursts again */
  useEffect(() => {
    if (seen.bursts > 0 && awaitingMod === id) awaitingMod = undefined;
  }, [seen.bursts, id]);
  return seen.bursts;
}

/**
 * The glow behind a freshly modded item, the one a caught character bursts with: soft rays that
 * swell out and turn around a warm core, then fade. Gone once it has played: a hidden inventory
 * shown again restarts any CSS animation still in it, which would replay the burst every open.
 */
export const ModBurst = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsPlaying(false), BURST_MS);
    return () => clearTimeout(timer);
  }, []);
  return isPlaying ? <BurstGlow /> : null;
};

const BurstGlow = () => (
  <Box
    aria-hidden
    sx={{
      "@keyframes mod-burst": {
        "0%": { transform: "scale(0) rotate(0deg)", opacity: 0.95 },
        "35%": { transform: "scale(1) rotate(25deg)", opacity: 0.95 },
        "55%": { opacity: 0.95 },
        "100%": { transform: "scale(1.1) rotate(70deg)", opacity: 0 },
      },
      position: "absolute",
      inset: "-25%",
      zIndex: 0,
      pointerEvents: "none",
      mixBlendMode: "screen",
      background: [
        "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,244,190,0.6) 18%, rgba(255,244,190,0) 40%)",
        "repeating-conic-gradient(rgba(255,255,255,0.9) 0deg 5deg, transparent 9deg 30deg)",
      ].join(", "),
      /* The rays fade out toward their tips */
      maskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.7) 30%, transparent 70%)",
      animation: `mod-burst ${BURST_MS}ms ease-out forwards`,
    }}
  />
);
