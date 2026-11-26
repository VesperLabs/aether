import { useEffect, useState } from "react";
import { readFrameWork } from "@/client/scenes/frame-work";

/** How much history the numbers cover, ms. */
const WINDOW_MS = 2000;
/** How often the numbers refresh, ms. */
const SHOW_EVERY_MS = 250;

export interface FrameStats {
  fps: number;
  /** The slowest frames over the window, ms. */
  frameP95Ms: number;
  frameMaxMs: number;
  /** Time our own code spends per frame (update and handing off drawing), ms. */
  workMs: number;
  workMaxMs: number;
  /** The canvas's size in real pixels: what the graphics card fills every frame. */
  pixels: string;
}

/** This browser's frame rate over the last couple of seconds, measured while it's mounted. */
export function useFrameStats(): FrameStats {
  const [stats, setStats] = useState<FrameStats>({
    fps: 0,
    frameP95Ms: 0,
    frameMaxMs: 0,
    workMs: 0,
    workMaxMs: 0,
    pixels: "",
  });
  useEffect(() => {
    const frames: { at: number; ms: number }[] = [];
    let last = performance.now();
    let shown = last;
    let id = 0;
    const onFrame = (now: number) => {
      frames.push({ at: now, ms: now - last });
      last = now;
      while (frames.length && frames[0]!.at < now - WINDOW_MS) frames.shift();
      if (now - shown >= SHOW_EVERY_MS && frames.length > 1) {
        shown = now;
        const work = readFrameWork();
        const lengths = frames.map((frame) => frame.ms).sort((a, b) => a - b);
        const span = now - frames[0]!.at + frames[0]!.ms;
        setStats({
          fps: (frames.length * 1000) / span,
          frameP95Ms: lengths[Math.floor(lengths.length * 0.95)] ?? 0,
          frameMaxMs: lengths[lengths.length - 1] ?? 0,
          workMs: work.averageMs,
          workMaxMs: work.maxMs,
          pixels: `${work.width}×${work.height}`,
        });
      }
      id = requestAnimationFrame(onFrame);
    };
    id = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(id);
  }, []);
  return stats;
}
